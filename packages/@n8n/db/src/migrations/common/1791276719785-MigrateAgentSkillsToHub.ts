import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createHash, randomUUID } from 'node:crypto';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type AgentRow = { id: string; projectId: string; schema: string | null; skills: string | null };
type HistoryRow = { versionId: string; agentId: string; skills: string | null };
type ProjectRow = { id: string; type: string };
type OwnerRow = { projectId: string; userId: string };

type SkillRef = { type: 'skill'; id: string; enabled?: boolean };
type SkillReference = { path: string; content: string };
type SkillBody = {
	name: string;
	description: string;
	instructions: string;
	allowedTools?: string[];
	references?: SkillReference[];
};

type Target = { userId: string | null; projectId: string | null };

type PlacedSkill = {
	id: string;
	/** Content hash of the draft row, name included. */
	hash: string;
	/** The draft row's content, used to save it as a version when nothing published matches. */
	draftBody: SkillBody;
	/** Content hash of the newest saved version (the highest number), or null while there is none. */
	latestHash: string | null;
	draftVersionId: string;
	/** True when no agent draft references the skill, only published history. */
	historyOnly: boolean;
	/** Saved version id by content hash (name included). */
	savedVersions: Map<string, string>;
	maxVersion: number;
};

/** `skill.id` is varchar(36); a longer legacy ref gets a minted id instead. */
const SKILL_ID_MAX_LENGTH = 36;

const BATCH_SIZE = 100;

/**
 * Moves the skill bodies stored on each agent row into the skills hub. Every agent gets
 * its own skills, also for identical copies. Names are copied exactly. Expand phase:
 * `agent_history` stays untouched and `agents.skills` keeps every body; only an agent
 * whose ref id changes has that body re-keyed, so it keeps reading its own copy until
 * agents switch to the hub. The oldest agent keeps a skill id; a later agent with the
 * same id gets a new one, and only that agent's ref changes.
 */
export class MigrateAgentSkillsToHub1791276719785 implements IrreversibleMigration {
	private targetsByProject = new Map<string, Target>();

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
		await this.loadTargets(context);
		await this.migrateDraftRefs(context);
		await this.migrateHistory(context);
		await this.saveUnpublishedDrafts(context);
		await this.writeDependencies(context);
		context.logger.info(`[${context.migrationName}] ${JSON.stringify(this.counts)}`);
	}

	private reset() {
		this.targetsByProject = new Map();
		this.agentProjects = new Map();
		this.skillsById = new Map();
		this.usedIds = new Set();
		this.refMapping = new Map();
		this.dependencies = new Set();
		this.counts = { skills: 0, renamedIds: 0, versions: 0, pins: 0, skippedRows: 0 };
	}

	private async loadTargets({ escape, runQuery }: MigrationContext) {
		const projects = await runQuery<ProjectRow[]>(
			`SELECT ${escape.columnName('id')}, ${escape.columnName('type')} FROM ${escape.tableName('project')}`,
		);
		// Joins the user table: a relation can outlive its user when foreign keys were not
		// enforced, and a skill must not point at a user that does not exist.
		const relation = escape.tableName('project_relation');
		const user = escape.tableName('user');
		const owners = await runQuery<OwnerRow[]>(
			`SELECT r.${escape.columnName('projectId')} AS ${escape.columnName('projectId')}, r.${escape.columnName('userId')} AS ${escape.columnName('userId')} FROM ${relation} r JOIN ${user} u ON u.${escape.columnName('id')} = r.${escape.columnName('userId')} WHERE r.${escape.columnName('role')} = 'project:personalOwner'`,
		);
		const ownerByProject = new Map(owners.map((row) => [row.projectId, row.userId]));
		for (const project of projects) {
			const owner = ownerByProject.get(project.id);
			// A personal project without an existing owner keeps its skills on the
			// project, so its agents keep working. It is the only personal-project target.
			this.targetsByProject.set(
				project.id,
				project.type === 'personal' && owner
					? { userId: owner, projectId: null }
					: { userId: null, projectId: project.id },
			);
		}
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
					try {
						await this.migrateAgentDraft(context, agent);
					} catch (error) {
						this.skipRow(context, `agent ${agent.id}`, error);
					}
				}
			},
			BATCH_SIZE,
		);
	}

	private async migrateAgentDraft(context: MigrationContext, agent: AgentRow) {
		const { escape, runQuery, parseJson } = context;
		const schema = agent.schema ? parseJson<{ skills?: unknown }>(agent.schema) : null;
		const bodies = toRecord(agent.skills ? parseJson<unknown>(agent.skills) : null);
		const refs = toSkillRefs(schema?.skills);
		const target = this.targetFor(agent.projectId);
		let rewritten = false;

		for (const ref of refs) {
			const key = `${agent.id}|${ref.id}`;
			// A body without a ref is never read today, so it is skipped. A ref without
			// a body stays as it is: validation reports it, as it does today.
			const body = toSkillBody(bodies[ref.id]);
			if (!body) continue;
			let skillId = this.refMapping.get(key);
			if (!skillId) {
				skillId = await this.placeSkill(context, target, body, ref.id, false);
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
					try {
						await this.migrateHistoryRow(context, row, projectId);
					} catch (error) {
						this.skipRow(context, `agent version ${row.versionId}`, error);
					}
				}
			},
			BATCH_SIZE,
		);
	}

	private async migrateHistoryRow(context: MigrationContext, row: HistoryRow, projectId: string) {
		const { escape, runQuery, parseJson } = context;
		const bodies = toRecord(parseJson<unknown>(row.skills!));
		const target = this.targetFor(projectId);

		for (const [refId, raw] of Object.entries(bodies)) {
			const body = toSkillBody(raw);
			if (!body) continue;
			const key = `${row.agentId}|${refId}`;
			let skillId = this.refMapping.get(key);
			if (!skillId) {
				// The skill left the draft after publish. It stays a normal live skill.
				skillId = await this.placeSkill(context, target, body, refId, true);
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
	 * Agents read saved versions only. A skill whose current text was never published,
	 * or was edited after its last publish, gets that text as its newest version, so
	 * every agent draft keeps running the text it has today.
	 */
	private async saveUnpublishedDrafts(context: MigrationContext) {
		for (const skill of this.skillsById.values()) {
			if (skill.latestHash === skill.hash) continue;
			skill.maxVersion++;
			const versionId = await this.insertVersion(
				context,
				skill.id,
				skill.maxVersion,
				skill.draftBody,
			);
			skill.savedVersions.set(skill.hash, versionId);
			skill.latestHash = skill.hash;
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

	/** Creates the skill for one ref of one agent, with a draft row that copies the body. */
	private async placeSkill(
		context: MigrationContext,
		target: Target,
		body: SkillBody,
		preferredId: string,
		historyOnly: boolean,
	): Promise<string> {
		const id =
			this.usedIds.has(preferredId) || preferredId.length > SKILL_ID_MAX_LENGTH
				? this.mintSkillId()
				: preferredId;
		this.usedIds.add(id);
		const { escape, runQuery } = context;
		const columns = ['id', 'userId', 'projectId', 'source', 'createdById'];
		await runQuery(
			`INSERT INTO ${escape.tableName('skill')} (${columns.map((c) => escape.columnName(c)).join(', ')}) VALUES (:id, :userId, :projectId, 'agent', NULL)`,
			{ id, userId: target.userId, projectId: target.projectId },
		);
		const draftVersionId = await this.insertVersion(context, id, null, body);
		this.skillsById.set(id, {
			id,
			hash: contentHash(body),
			draftBody: body,
			latestHash: null,
			draftVersionId,
			historyOnly,
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
		let versionId = skill.savedVersions.get(hash);
		if (!versionId) {
			skill.maxVersion++;
			versionId = await this.insertVersion(context, skillId, skill.maxVersion, body);
			skill.savedVersions.set(hash, versionId);
			skill.latestHash = hash;
			this.counts.versions++;
		}

		// A history-only skill has no draft of its own, so its draft follows the newest
		// published content, also when that content repeats an older version.
		if (skill.historyOnly && skill.hash !== hash) {
			await this.replaceDraft(context, skill.draftVersionId, body);
			skill.draftBody = body;
			skill.hash = hash;
		}
		return versionId;
	}

	private async insertVersion(
		context: MigrationContext,
		skillId: string,
		version: number | null,
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

	/** Keeps the order of today's references array in `position`. */
	private async insertFiles(
		{ escape, runQuery }: MigrationContext,
		skillVersionId: string,
		body: SkillBody,
	) {
		const columns = ['skillVersionId', 'path', 'position', 'content', 'sizeBytes']
			.map((c) => escape.columnName(c))
			.join(', ');
		for (const [position, reference] of (body.references ?? []).entries()) {
			await runQuery(
				`INSERT INTO ${escape.tableName('skill_file')} (${columns}) VALUES (:skillVersionId, :path, :position, :content, :sizeBytes)`,
				{
					skillVersionId,
					path: reference.path,
					position,
					content: reference.content,
					sizeBytes: Buffer.byteLength(reference.content, 'utf8'),
				},
			);
		}
	}

	private async replaceDraft(context: MigrationContext, draftVersionId: string, body: SkillBody) {
		const { escape, runQuery } = context;
		await runQuery(
			`UPDATE ${escape.tableName('skill_version')} SET ${escape.columnName('name')} = :name, ${escape.columnName('description')} = :description, ${escape.columnName('instructions')} = :instructions, ${escape.columnName('frontmatter')} = :frontmatter, ${escape.columnName('contentHash')} = :contentHash WHERE ${escape.columnName('id')} = :id`,
			{
				id: draftVersionId,
				name: body.name,
				description: body.description,
				instructions: body.instructions,
				frontmatter: toFrontmatterJson(body),
				contentHash: contentHash(body),
			},
		);
		await runQuery(
			`DELETE FROM ${escape.tableName('skill_file')} WHERE ${escape.columnName('skillVersionId')} = :id`,
			{ id: draftVersionId },
		);
		await this.insertFiles(context, draftVersionId, body);
	}

	/** A row the migration cannot read is logged and left as it is; the rest proceeds. */
	private skipRow({ logger, migrationName }: MigrationContext, what: string, error: unknown) {
		this.counts.skippedRows++;
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`[${migrationName}] Skipping ${what}: ${message}`);
	}

	private targetFor(projectId: string): Target {
		return this.targetsByProject.get(projectId) ?? { userId: null, projectId };
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
		const files = references.filter(
			(reference): reference is SkillReference =>
				isRecord(reference) &&
				typeof reference.path === 'string' &&
				typeof reference.content === 'string',
		);
		if (files.length > 0) body.references = files;
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
 * Identity of a version's content, name included. File order is part of the content.
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
				files: (body.references ?? []).map((reference) => [reference.path, reference.content]),
			}),
		)
		.digest('hex');
}
