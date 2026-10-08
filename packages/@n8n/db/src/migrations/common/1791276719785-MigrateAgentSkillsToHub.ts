import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createHash, randomUUID } from 'node:crypto';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type AgentRow = { id: string; projectId: string; schema: string | null; skills: string | null };
type HistoryRow = { versionId: string; agentId: string; skills: string | null };

type SkillRef = { type: 'skill'; id: string; enabled?: boolean };
type SkillReference = { path: string; content: string };
type SkillBody = {
	name: string;
	description: string;
	instructions: string;
	allowedTools?: string[];
	references?: SkillReference[];
};

type ParsedAgent = { schema: { skills?: unknown } | null; bodies: Record<string, unknown> };

type PlacedSkill = {
	id: string;
	/** The text an agent draft runs today. Null for a skill only published versions use. */
	currentBody: SkillBody | null;
	/** Content hash of the newest version (the highest number), or null while there is none. */
	latestHash: string | null;
	/** Version id by content hash (name included). */
	savedVersions: Map<string, string>;
	maxVersion: number;
};

/** `skill.id` is varchar(36); a longer legacy ref gets a minted id instead. */
const SKILL_ID_MAX_LENGTH = 36;

const BATCH_SIZE = 100;

/**
 * Moves the skill bodies stored on each agent row into the skills hub, as saved
 * versions only: there is no draft row. Every agent gets
 * its own skills, also for identical copies, in the agent's own project (team or
 * personal): agents never use "Just you" skills. Names are copied exactly. Expand phase:
 * `agent_history` stays untouched and `agents.skills` keeps every body; only an agent
 * whose ref id changes has that body re-keyed, so it keeps reading its own copy until
 * agents switch to the hub. The oldest agent keeps a skill id; a later agent with the
 * same id gets a new one, and only that agent's ref changes.
 */
export class MigrateAgentSkillsToHub1791276719785 implements IrreversibleMigration {
	/** Agent id to project id, filled by the draft pass and read by the history pass. */
	private agentProjects = new Map<string, string>();

	private skillsById = new Map<string, PlacedSkill>();

	private usedIds = new Set<string>();

	/** (agentId, ref id as written in the agent) to hub skill id. */
	private refMapping = new Map<string, string>();

	private dependencies = new Set<string>();

	private counts = { skills: 0, renamedIds: 0, versions: 0, pins: 0, skippedRows: 0 };

	async up(context: MigrationContext) {
		// TypeORM keeps one instance per data source, so a run starts from empty state.
		this.reset();
		await this.migrateDraftRefs(context);
		await this.migrateHistory(context);
		await this.saveCurrentText(context);
		await this.writeDependencies(context);
		context.logger.info(`[${context.migrationName}] ${JSON.stringify(this.counts)}`);
	}

	private reset() {
		this.agentProjects = new Map();
		this.skillsById = new Map();
		this.usedIds = new Set();
		this.refMapping = new Map();
		this.dependencies = new Set();
		this.counts = { skills: 0, renamedIds: 0, versions: 0, pins: 0, skippedRows: 0 };
	}

	private async migrateDraftRefs(context: MigrationContext) {
		const { escape, runInBatches } = context;
		const columns = ['id', 'projectId', 'schema', 'skills']
			.map((name) => escape.columnName(name))
			.join(', ');
		// Updates below never change the sort key, so offset paging stays stable.
		await runInBatches<AgentRow>(
			`SELECT ${columns} FROM ${escape.tableName('agents')} ORDER BY ${escape.columnName('createdAt')}, ${escape.columnName('id')}`,
			async (agents) => {
				for (const agent of agents) {
					this.agentProjects.set(agent.id, agent.projectId);
					// Only unreadable JSON is skipped. A failed write throws, so the
					// migration aborts instead of being recorded with rows left behind.
					const parsed = this.parseAgent(context, agent);
					if (parsed) await this.migrateAgentDraft(context, agent, parsed);
				}
			},
			BATCH_SIZE,
		);
	}

	private parseAgent(context: MigrationContext, agent: AgentRow): ParsedAgent | null {
		try {
			const schema = agent.schema ? context.parseJson<{ skills?: unknown }>(agent.schema) : null;
			const bodies = toRecord(agent.skills ? context.parseJson<unknown>(agent.skills) : null);
			return { schema, bodies };
		} catch (error) {
			this.skipRow(context, `agent ${agent.id}`, error);
			return null;
		}
	}

	private async migrateAgentDraft(
		context: MigrationContext,
		agent: AgentRow,
		{ schema, bodies }: ParsedAgent,
	) {
		const { escape, runQuery } = context;
		const refs = toSkillRefs(schema?.skills);
		let rewritten = false;

		for (const ref of refs) {
			const key = `${agent.id}|${ref.id}`;
			// A body without a ref is never read today, so it is skipped. A ref without
			// a body stays as it is: validation reports it, as it does today.
			const body = toSkillBody(bodies[ref.id]);
			if (!body) continue;
			let skillId = this.refMapping.get(key);
			if (!skillId) {
				skillId = await this.placeSkill(context, agent.projectId, ref.id, body);
				this.refMapping.set(key, skillId);
			}
			this.dependencies.add(`${agent.id}|${skillId}`);
			if (skillId !== ref.id) {
				// The agent reads `skills[ref.id]` until it switches to the hub, so the
				// body moves to the new key together with the ref.
				bodies[skillId] = bodies[ref.id];
				delete bodies[ref.id];
				ref.id = skillId;
				rewritten = true;
			}
		}

		if (rewritten && schema) {
			this.counts.renamedIds++;
			await runQuery(
				`UPDATE ${escape.tableName('agents')} SET ${escape.columnName('schema')} = :schema, ${escape.columnName('skills')} = :skills WHERE ${escape.columnName('id')} = :id`,
				{ schema: JSON.stringify(schema), skills: JSON.stringify(bodies), id: agent.id },
			);
		}
	}

	private async migrateHistory(context: MigrationContext) {
		const { escape, runInBatches } = context;
		const columns = ['versionId', 'agentId', 'skills'].map((name) => escape.columnName(name));
		await runInBatches<HistoryRow>(
			`SELECT ${columns.join(', ')} FROM ${escape.tableName('agent_history')} ORDER BY ${escape.columnName('createdAt')}, ${escape.columnName('versionId')}`,
			async (rows) => {
				for (const row of rows) {
					const projectId = this.agentProjects.get(row.agentId);
					if (projectId === undefined || !row.skills) continue;
					const bodies = this.parseHistorySkills(context, row);
					if (bodies) await this.migrateHistoryRow(context, row, projectId, bodies);
				}
			},
			BATCH_SIZE,
		);
	}

	private parseHistorySkills(
		context: MigrationContext,
		row: HistoryRow,
	): Record<string, unknown> | null {
		try {
			return toRecord(context.parseJson<unknown>(row.skills!));
		} catch (error) {
			this.skipRow(context, `agent version ${row.versionId}`, error);
			return null;
		}
	}

	private async migrateHistoryRow(
		context: MigrationContext,
		row: HistoryRow,
		projectId: string,
		bodies: Record<string, unknown>,
	) {
		const { escape, runQuery } = context;

		for (const [refId, raw] of Object.entries(bodies)) {
			const body = toSkillBody(raw);
			if (!body) continue;
			const key = `${row.agentId}|${refId}`;
			let skillId = this.refMapping.get(key);
			if (!skillId) {
				// The skill left the draft after publish. It stays a normal live skill.
				skillId = await this.placeSkill(context, projectId, refId, null);
				this.refMapping.set(key, skillId);
			}
			const versionId = await this.savedVersionFor(context, skillId, body);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_history_skill')} (${escape.columnName('agentVersionId')}, ${escape.columnName('skillRefId')}, ${escape.columnName('skillVersionId')}) VALUES (:agentVersionId, :skillRefId, :skillVersionId)`,
				{ agentVersionId: row.versionId, skillRefId: refId, skillVersionId: versionId },
			);
			this.counts.pins++;
		}
	}

	/**
	 * Agents run the latest version. A skill whose current text was never published,
	 * or was edited after its last publish, gets that text as its newest version, so
	 * every agent draft keeps running the text it has today.
	 */
	private async saveCurrentText(context: MigrationContext) {
		for (const skill of this.skillsById.values()) {
			if (!skill.currentBody) continue;
			const hash = contentHash(skill.currentBody);
			if (skill.latestHash === hash) continue;
			skill.maxVersion++;
			const versionId = await this.insertVersion(
				context,
				skill.id,
				skill.maxVersion,
				skill.currentBody,
			);
			skill.savedVersions.set(hash, versionId);
			skill.latestHash = hash;
			this.counts.versions++;
		}
	}

	private async writeDependencies({ escape, runQuery }: MigrationContext) {
		for (const entry of this.dependencies) {
			const [agentId, skillId] = entry.split('|');
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_skill_dependency')} (${escape.columnName('agentId')}, ${escape.columnName('skillId')}) VALUES (:agentId, :skillId)`,
				{ agentId, skillId },
			);
		}
	}

	/** Creates the skill for one ref of one agent. Its versions come later. */
	private async placeSkill(
		context: MigrationContext,
		projectId: string,
		preferredId: string,
		currentBody: SkillBody | null,
	): Promise<string> {
		const id =
			this.usedIds.has(preferredId) || preferredId.length > SKILL_ID_MAX_LENGTH
				? this.mintSkillId()
				: preferredId;
		this.usedIds.add(id);
		const { escape, runQuery } = context;
		const columns = ['id', 'userId', 'projectId', 'source', 'createdById'];
		await runQuery(
			`INSERT INTO ${escape.tableName('skill')} (${columns.map((c) => escape.columnName(c)).join(', ')}) VALUES (:id, NULL, :projectId, 'agent', NULL)`,
			{ id, projectId },
		);
		this.skillsById.set(id, {
			id,
			currentBody,
			latestHash: null,
			savedVersions: new Map(),
			maxVersion: 0,
		});
		this.counts.skills++;
		return id;
	}

	/** Reuses any saved version with the same name and text; otherwise inserts max + 1. */
	private async savedVersionFor(
		context: MigrationContext,
		skillId: string,
		body: SkillBody,
	): Promise<string> {
		const skill = this.skillsById.get(skillId);
		if (!skill) throw new Error(`Skill ${skillId} was not created by this migration`);

		const hash = contentHash(body);
		const reused = skill.savedVersions.get(hash);
		if (reused) return reused;

		skill.maxVersion++;
		const versionId = await this.insertVersion(context, skillId, skill.maxVersion, body);
		skill.savedVersions.set(hash, versionId);
		skill.latestHash = hash;
		this.counts.versions++;
		return versionId;
	}

	private async insertVersion(
		context: MigrationContext,
		skillId: string,
		version: number,
		body: SkillBody,
	): Promise<string> {
		const { escape, runQuery } = context;
		const id = randomUUID();
		const columns = [
			'id',
			'skillId',
			'version',
			'name',
			'description',
			'instructions',
			'frontmatter',
			'contentHash',
		];
		await runQuery(
			`INSERT INTO ${escape.tableName('skill_version')} (${columns.map((c) => escape.columnName(c)).join(', ')}) VALUES (:id, :skillId, :version, :name, :description, :instructions, :frontmatter, :contentHash)`,
			{
				id,
				skillId,
				version,
				name: body.name,
				description: body.description,
				instructions: body.instructions,
				frontmatter: toFrontmatterJson(body),
				contentHash: contentHash(body),
			},
		);
		await this.insertFiles(context, id, body);
		return id;
	}

	/** Files carry no order of their own; readers and the content hash sort them by path. */
	private async insertFiles(
		{ escape, runQuery }: MigrationContext,
		skillVersionId: string,
		body: SkillBody,
	) {
		const columns = ['skillVersionId', 'path', 'content']
			.map((c) => escape.columnName(c))
			.join(', ');
		for (const reference of body.references ?? []) {
			await runQuery(
				`INSERT INTO ${escape.tableName('skill_file')} (${columns}) VALUES (:skillVersionId, :path, :content)`,
				{
					skillVersionId,
					path: reference.path,
					content: reference.content,
				},
			);
		}
	}

	/** A row whose JSON cannot be read is logged and left as it is; the rest proceeds. */
	private skipRow({ logger, migrationName }: MigrationContext, what: string, error: unknown) {
		this.counts.skippedRows++;
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`[${migrationName}] Skipping ${what}: ${message}`);
	}

	private mintSkillId(): string {
		for (;;) {
			const id = `skill_${generateNanoId()}`;
			if (!this.usedIds.has(id)) return id;
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

/** Only refs with a usable id are kept; anything else in the list is ignored. */
function toSkillRefs(value: unknown): SkillRef[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(ref): ref is SkillRef =>
			isRecord(ref) && ref.type === 'skill' && typeof ref.id === 'string' && ref.id.length > 0,
	);
}

/** Null for a body the runtime could not load either. Optional fields are kept only when well formed. */
function toSkillBody(raw: unknown): SkillBody | null {
	if (!isRecord(raw)) return null;
	const { name, description, instructions, allowedTools, references } = raw;
	if (
		typeof name !== 'string' ||
		typeof description !== 'string' ||
		typeof instructions !== 'string'
	) {
		return null;
	}
	const body: SkillBody = { name, description, instructions };
	if (Array.isArray(allowedTools)) {
		const tools = allowedTools.filter((tool): tool is string => typeof tool === 'string');
		if (tools.length > 0) body.allowedTools = tools;
	}
	if (Array.isArray(references)) {
		// (skillVersionId, path) is the primary key: a repeated path keeps its first copy,
		// as the API's own validation would have refused the second.
		const files = new Map<string, SkillReference>();
		for (const reference of references) {
			if (
				isRecord(reference) &&
				typeof reference.path === 'string' &&
				typeof reference.content === 'string' &&
				!files.has(reference.path)
			) {
				files.set(reference.path, { path: reference.path, content: reference.content });
			}
		}
		if (files.size > 0) body.references = [...files.values()];
	}
	return body;
}

function toFrontmatter(body: SkillBody): Record<string, string> | null {
	if (!body.allowedTools?.length) return null;
	return { 'allowed-tools': body.allowedTools.join(' ') };
}

function toFrontmatterJson(body: SkillBody): string | null {
	const frontmatter = toFrontmatter(body);
	return frontmatter ? JSON.stringify(frontmatter) : null;
}

/**
 * Identity of a version's content, name included. Files are sorted by path, so upload
 * order does not change the hash.
 * Must produce the same value as `skillContentHash` in the agents module, so a publish
 * after the migration finds the migrated versions by hash.
 */
function contentHash(body: SkillBody): string {
	const frontmatter = toFrontmatter(body);
	return createHash('sha256')
		.update(
			JSON.stringify({
				name: body.name,
				description: body.description,
				instructions: body.instructions,
				frontmatter: frontmatter
					? Object.fromEntries(
							Object.keys(frontmatter)
								.sort()
								.map((key) => [key, frontmatter[key]]),
						)
					: null,
				files: (body.references ?? [])
					.map((reference) => [reference.path, reference.content])
					.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
			}),
		)
		.digest('hex');
}
