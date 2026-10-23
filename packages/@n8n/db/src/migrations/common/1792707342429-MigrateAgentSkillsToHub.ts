import { Container } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { createHash, randomUUID } from 'node:crypto';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type AgentRow = { id: string; createdAt: Date | string; schema: unknown; skills: unknown };
type HistoryRow = { schema: unknown; skills: unknown };
type VersionRow = {
	id: string;
	skillId: string;
	version: number;
	contentHash: string;
	agentId: string | null;
};

type SkillFileContent = { path: string; content: string };
type SkillContent = {
	name: string;
	description: string;
	instructions: string;
	frontmatter: Record<string, unknown> | null;
	files: SkillFileContent[];
};
type InlineSkill = { refId: string; content: SkillContent };

type HubVersion = { id: string; skillId: string };

/**
 * What one agent's copy knows: hub versions by content hash, the hub skill of each ref,
 * and the ref that claimed each skill, so two refs with the same body keep two skills.
 */
type AgentState = {
	byHash: Map<string, HubVersion[]>;
	skillByRef: Map<string, string>;
	refBySkill: Map<string, string>;
	latest: Map<string, { hash: string; version: number }>;
	/** The skills that belong to this agent only (`skill.agentId`). */
	owned: Set<string>;
};

type Counts = {
	agents: number;
	skills: number;
	versions: number;
	pins: number;
	skipped: number;
	failed: number;
};

/** An agent in (`createdAt`, `id`) order, `createdAt` as an ISO string. */
type AgentKey = { createdAt: string; id: string };

/** `skill.id` is varchar(36). A longer inline ref id gets a new id. */
const SKILL_ID_MAX_LENGTH = 36;

const BATCH_SIZE = 100;

/** How many failed agents the Sentry event lists. It counts all of them. */
const REPORTED_FAILURES = 100;

/** Settings key of the progress that the startup copy saved on instances where it ran. */
const STARTUP_COPY_PROGRESS_KEY = 'agents.skillsHubCopy';

/**
 * Copies the inline skills of agents (`agents.skills`, `agent_history.skills`) into the
 * skills hub, so every instance reads agent skills from the hub. Each inline skill becomes
 * an agent skill of its agent. It applies the rules of the startup copy that ran while the
 * hub was behind `N8N_AGENTS_SKILLS_HUB_ENABLED`, so an agent that copy already handled is
 * left as it is:
 * - Where the startup copy ran, it saved its progress in the settings row
 *   `agents.skillsHubCopy`. The migration copies only the drafts that copy did not check
 *   or that failed. A draft is copied once: a skill that a user detached and deleted after
 *   the startup copy stays deleted, although the legacy columns still hold it.
 * - A published version is copied only while it pins nothing. Its bodies become versions
 *   and it pins them.
 * - A draft is copied only while the agent has no hub rows at all. Its refs become
 *   dependency rows, and its current text becomes the newest version of each skill.
 * - Content that a skill of the agent already holds is reused, found by content hash.
 * - Refs that were switched off, and bodies that no ref uses, are not copied.
 *
 * The legacy columns stay as they are. A later migration removes them.
 */
export class MigrateAgentSkillsToHub1792707342429 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runInBatches, logger, migrationName } = context;
		const counts: Counts = { agents: 0, skills: 0, versions: 0, pins: 0, skipped: 0, failed: 0 };
		const failures: Array<{ agentId: string; error: string }> = [];
		const columns = ['id', 'createdAt', 'schema', 'skills']
			.map((name) => escape.columnName(name))
			.join(', ');
		const mayCopyDraft = await this.readDraftScope(context);

		// This migration writes no agent rows, so offset paging stays stable.
		await runInBatches<AgentRow>(
			`SELECT ${columns} FROM ${escape.tableName('agents')} ORDER BY ${escape.columnName('createdAt')}, ${escape.columnName('id')}`,
			async (agents) => {
				for (const agent of agents) {
					const error = await this.copyAgentInSavepoint(
						context,
						agent,
						mayCopyDraft(agent),
						counts,
					);
					if (error !== undefined) failures.push({ agentId: agent.id, error });
				}
			},
			BATCH_SIZE,
		);

		logger.info(`[${migrationName}] Copied inline agent skills into the skills hub`, counts);
		if (failures.length > 0) {
			// These agents keep their inline skills only in the legacy columns, and nothing
			// copies them again, so report them where Sentry is set up.
			const agentIds = failures.map((failure) => failure.agentId);
			logger.error(
				`[${migrationName}] Could not copy the skills of these agents into the skills hub`,
				{ agentIds },
			);
			Container.get(ErrorReporter).error(
				new UnexpectedError(
					`[${migrationName}] Could not copy the skills of some agents into the skills hub`,
					{
						tags: { migration: migrationName },
						extra: { failed: failures.length, failures: failures.slice(0, REPORTED_FAILURES) },
					},
				),
				{ shouldBeLogged: false },
			);
		}
	}

	/**
	 * Which drafts to copy, from the progress of the startup copy. `through` is the last
	 * agent that copy checked: its draft and the drafts before it, in (`createdAt`, `id`)
	 * order, are not copied again, except `retryAgentIds`, the drafts whose copy failed.
	 * Without that row, every draft follows the copy rules. With an unreadable row, no draft
	 * is copied: reopening every draft could bring back skills that users deleted.
	 */
	private async readDraftScope(
		context: MigrationContext,
	): Promise<(agent: Pick<AgentRow, 'createdAt' | 'id'>) => boolean> {
		const { escape, runQuery, logger, migrationName } = context;
		const [row] = await runQuery<Array<{ value: string }>>(
			`SELECT ${escape.columnName('value')} AS ${escape.columnName('value')} FROM ${escape.tableName('settings')} WHERE ${escape.columnName('key')} = :key`,
			{ key: STARTUP_COPY_PROGRESS_KEY },
		);
		if (!row) return () => true;

		const progress = parseStartupCopyProgress(context, row.value);
		if (!progress) {
			logger.error(
				`[${migrationName}] Unreadable startup copy progress in ${STARTUP_COPY_PROGRESS_KEY}: no agent draft is copied`,
			);
			return () => false;
		}
		const { through, retryAgentIds } = progress;
		return (agent) => through === null || isAfter(agent, through) || retryAgentIds.has(agent.id);
	}

	/**
	 * Copies one agent. A failed write rolls back only this agent, so one broken agent
	 * does not stop the others. The agent keeps its inline skills in the legacy columns.
	 * Returns the error message when the copy failed.
	 */
	private async copyAgentInSavepoint(
		context: MigrationContext,
		agent: AgentRow,
		draftAllowed: boolean,
		counts: Counts,
	): Promise<string | undefined> {
		const { queryRunner, logger, migrationName } = context;
		const draft = this.readInline(context, `agent ${agent.id}`, agent.schema, agent.skills);
		// Published versions are loaded one at a time: an agent can have many large ones.
		const versionIds = await this.findUnpinnedVersionIds(context, agent.id);
		const copyDraft =
			draftAllowed && draft.length > 0 && !(await this.hasHubState(context, agent.id));
		if (versionIds.length === 0 && !copyDraft) {
			counts.skipped++;
			return undefined;
		}

		await queryRunner.query('SAVEPOINT copy_agent_skills');
		const agentCounts = { skills: 0, versions: 0, pins: 0 };
		try {
			// An agent whose draft is copied has no hub rows, so there is nothing to load.
			const state = copyDraft ? emptyState() : await this.loadState(context, agent.id);
			for (const versionId of versionIds) {
				const version = await this.findVersion(context, versionId);
				const skills = version
					? this.readInline(context, `version ${versionId}`, version.schema, version.skills)
					: [];
				if (skills.length === 0) continue;
				// One pin per skill, in ref order.
				const pins = new Map<string, string>();
				for (const { refId, content } of skills) {
					const pinned = await this.versionFor(
						context,
						agent.id,
						refId,
						content,
						false,
						state,
						agentCounts,
					);
					if (!pins.has(pinned.skillId)) pins.set(pinned.skillId, pinned.id);
				}
				await this.insertPins(
					context,
					versionId,
					[...pins].map(([skillId, skillVersionId]) => ({ skillId, skillVersionId })),
				);
				agentCounts.pins += pins.size;
			}
			if (copyDraft) {
				const skillIds = new Set<string>();
				for (const { refId, content } of draft) {
					// The draft runs the newest version, so its text must be the newest one.
					const { skillId } = await this.versionFor(
						context,
						agent.id,
						refId,
						content,
						true,
						state,
						agentCounts,
					);
					skillIds.add(skillId);
				}
				await this.insertDependencies(context, agent.id, [...skillIds]);
			}
			await queryRunner.query('RELEASE SAVEPOINT copy_agent_skills');
		} catch (error) {
			await queryRunner.query('ROLLBACK TO SAVEPOINT copy_agent_skills');
			await queryRunner.query('RELEASE SAVEPOINT copy_agent_skills');
			counts.failed++;
			const message = error instanceof Error ? error.message : String(error);
			logger.error(`[${migrationName}] Failed to copy the skills of agent ${agent.id}. Skipping.`, {
				error: message,
			});
			return message;
		}
		if (!copyDraft && agentCounts.pins === 0) {
			// Its unpinned versions had no inline skills.
			counts.skipped++;
			return undefined;
		}
		counts.agents++;
		counts.skills += agentCounts.skills;
		counts.versions += agentCounts.versions;
		counts.pins += agentCounts.pins;
		return undefined;
	}

	/**
	 * The inline skills of a draft or a published version, in ref order: each ref that is
	 * not switched off and has a body the runtime could load. Unreadable JSON gives none.
	 */
	private readInline(
		context: MigrationContext,
		label: string,
		rawSchema: unknown,
		rawSkills: unknown,
	): InlineSkill[] {
		let schema: unknown;
		let bodies: unknown;
		try {
			schema = rawSchema === null ? null : context.parseJson<unknown>(rawSchema);
			bodies = rawSkills === null ? null : context.parseJson<unknown>(rawSkills);
		} catch (error) {
			context.logger.warn(
				`[${context.migrationName}] Unreadable skills JSON on ${label}. Skipping.`,
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
			return [];
		}
		const refs = isRecord(schema) ? schema.skills : undefined;
		if (!Array.isArray(refs)) return [];
		const bodyById = isRecord(bodies) ? bodies : {};
		const seen = new Set<string>();
		const result: InlineSkill[] = [];
		for (const ref of refs as unknown[]) {
			if (!isRecord(ref) || ref.type !== 'skill' || typeof ref.id !== 'string') continue;
			if (ref.enabled === false || seen.has(ref.id)) continue;
			seen.add(ref.id);
			const content = toContent(Object.hasOwn(bodyById, ref.id) ? bodyById[ref.id] : undefined);
			if (content) result.push({ refId: ref.id, content });
		}
		return result;
	}

	/** Whether the agent has a dependency row, an agent skill or a pinned published version. */
	private async hasHubState(context: MigrationContext, agentId: string): Promise<boolean> {
		const { escape, runQuery } = context;
		const [row] = await runQuery<Array<{ found: number }>>(
			`SELECT 1 AS found WHERE EXISTS (
				SELECT 1 FROM ${escape.tableName('agent_skill_dependency')} WHERE ${escape.columnName('agentId')} = :agentId
			) OR EXISTS (
				SELECT 1 FROM ${escape.tableName('skill')} WHERE ${escape.columnName('agentId')} = :agentId
			) OR EXISTS (
				SELECT 1 FROM ${escape.tableName('agent_version_skill_dependency')} pin
				INNER JOIN ${escape.tableName('agent_history')} history
					ON history.${escape.columnName('versionId')} = pin.${escape.columnName('agentVersionId')}
				WHERE history.${escape.columnName('agentId')} = :agentId
			)`,
			{ agentId },
		);
		return row !== undefined;
	}

	/**
	 * The ids of the published versions of an agent that pin no skill and have inline
	 * skills, oldest first.
	 */
	private async findUnpinnedVersionIds(
		context: MigrationContext,
		agentId: string,
	): Promise<string[]> {
		const { escape, runQuery } = context;
		const versionId = escape.columnName('versionId');
		const rows = await runQuery<Array<{ versionId: string }>>(
			`SELECT history.${versionId} AS ${versionId}
			FROM ${escape.tableName('agent_history')} history
			WHERE history.${escape.columnName('agentId')} = :agentId
			AND history.${escape.columnName('skills')} IS NOT NULL
			AND NOT EXISTS (
				SELECT 1 FROM ${escape.tableName('agent_version_skill_dependency')} pin
				WHERE pin.${escape.columnName('agentVersionId')} = history.${versionId}
			)
			ORDER BY history.${escape.columnName('createdAt')} ASC, history.${versionId} ASC`,
			{ agentId },
		);
		return rows.map((row) => row.versionId);
	}

	private async findVersion(
		context: MigrationContext,
		versionId: string,
	): Promise<HistoryRow | undefined> {
		const { escape, runQuery } = context;
		const columns = ['schema', 'skills'].map((name) => escape.columnName(name)).join(', ');
		const [row] = await runQuery<HistoryRow[]>(
			`SELECT ${columns} FROM ${escape.tableName('agent_history')} WHERE ${escape.columnName('versionId')} = :versionId`,
			{ versionId },
		);
		return row;
	}

	/** Every version of the skills the agent owns or its draft refers to, oldest first. */
	private async loadState(context: MigrationContext, agentId: string): Promise<AgentState> {
		const { escape, runQuery } = context;
		const skillId = escape.columnName('skillId');
		const rows = await runQuery<VersionRow[]>(
			`SELECT version.${escape.columnName('id')} AS ${escape.columnName('id')}, version.${skillId} AS ${skillId},
				version.${escape.columnName('version')} AS ${escape.columnName('version')},
				version.${escape.columnName('contentHash')} AS ${escape.columnName('contentHash')},
				skill.${escape.columnName('agentId')} AS ${escape.columnName('agentId')}
			FROM ${escape.tableName('skill_version')} version
			INNER JOIN ${escape.tableName('skill')} skill ON skill.${escape.columnName('id')} = version.${skillId}
			WHERE skill.${escape.columnName('agentId')} = :agentId
			OR skill.${escape.columnName('id')} IN (
				SELECT dep.${skillId} FROM ${escape.tableName('agent_skill_dependency')} dep
				WHERE dep.${escape.columnName('agentId')} = :agentId
			)
			ORDER BY version.${escape.columnName('version')} ASC`,
			{ agentId },
		);
		const state = emptyState();
		for (const row of rows) {
			if (row.agentId === agentId) state.owned.add(row.skillId);
			const version = Number(row.version);
			addByHash(state, row.contentHash, { id: row.id, skillId: row.skillId });
			const current = state.latest.get(row.skillId);
			if (!current || version > current.version) {
				state.latest.set(row.skillId, { hash: row.contentHash, version });
			}
		}
		return state;
	}

	/**
	 * The hub version that holds this inline body. A ref seen before uses its own skill: a
	 * version with the same content, else a new version. A new ref uses the agent skill
	 * with its id, as the startup copy created it, then a skill with the same content that
	 * no other ref claimed, else it creates an agent skill. With
	 * `mustBeLatest`, a match that is not the newest version of its skill gets the body
	 * again as the newest one.
	 */
	private async versionFor(
		context: MigrationContext,
		agentId: string,
		refId: string,
		content: SkillContent,
		mustBeLatest: boolean,
		state: AgentState,
		counts: { skills: number; versions: number },
	): Promise<HubVersion> {
		const hash = contentHash(content);
		const matches = state.byHash.get(hash) ?? [];
		const ownSkillOfRef =
			state.owned.has(refId) && !state.refBySkill.has(refId) ? refId : undefined;
		const existing =
			state.skillByRef.get(refId) ??
			ownSkillOfRef ??
			matches.find((version) => !state.refBySkill.has(version.skillId))?.skillId;
		if (existing) {
			claim(state, refId, existing);
			const match = matches.find((version) => version.skillId === existing);
			if (match && (!mustBeLatest || state.latest.get(existing)?.hash === hash)) return match;
			const next = (state.latest.get(existing)?.version ?? 0) + 1;
			const id = await this.insertVersion(context, existing, next, content, hash);
			await this.touchSkill(context, existing);
			const version = { id, skillId: existing };
			addByHash(state, hash, version);
			state.latest.set(existing, { hash, version: next });
			counts.versions++;
			return version;
		}

		const skillId = await this.newSkillId(context, refId);
		await this.insertSkill(context, skillId, agentId);
		const id = await this.insertVersion(context, skillId, 1, content, hash);
		const version = { id, skillId };
		addByHash(state, hash, version);
		claim(state, refId, skillId);
		state.latest.set(skillId, { hash, version: 1 });
		counts.skills++;
		counts.versions++;
		return version;
	}

	/** Keeps the inline ref id when it is free and short enough, else a new one. */
	private async newSkillId(context: MigrationContext, refId: string): Promise<string> {
		if (refId.length <= SKILL_ID_MAX_LENGTH) {
			const { escape, runQuery } = context;
			const taken = await runQuery<unknown[]>(
				`SELECT 1 FROM ${escape.tableName('skill')} WHERE ${escape.columnName('id')} = :id`,
				{ id: refId },
			);
			if (taken.length === 0) return refId;
		}
		return `skill_${generateNanoId()}`;
	}

	private async insertSkill(context: MigrationContext, id: string, agentId: string) {
		const { escape, runQuery } = context;
		const columns = ['id', 'projectId', 'agentId', 'source', 'createdById']
			.map((name) => escape.columnName(name))
			.join(', ');
		await runQuery(
			`INSERT INTO ${escape.tableName('skill')} (${columns}) VALUES (:id, NULL, :agentId, 'agent', NULL)`,
			{ id, agentId },
		);
	}

	/** Moves the skill up the hub list, as a saved version does in the app. */
	private async touchSkill(context: MigrationContext, skillId: string) {
		const { escape, runQuery } = context;
		await runQuery(
			`UPDATE ${escape.tableName('skill')} SET ${escape.columnName('updatedAt')} = :now WHERE ${escape.columnName('id')} = :id`,
			{ id: skillId, now: toTimestamp(context, new Date()) },
		);
	}

	private async insertVersion(
		context: MigrationContext,
		skillId: string,
		version: number,
		content: SkillContent,
		hash: string,
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
			'createdById',
		]
			.map((name) => escape.columnName(name))
			.join(', ');
		await runQuery(
			`INSERT INTO ${escape.tableName('skill_version')} (${columns})
			VALUES (:id, :skillId, :version, :name, :description, :instructions, NULL, :contentHash, NULL)`,
			{
				id,
				skillId,
				version,
				name: content.name,
				description: content.description,
				instructions: content.instructions,
				contentHash: hash,
			},
		);
		const fileColumns = ['skillVersionId', 'path', 'content']
			.map((name) => escape.columnName(name))
			.join(', ');
		for (const file of content.files) {
			await runQuery(
				`INSERT INTO ${escape.tableName('skill_file')} (${fileColumns}) VALUES (:skillVersionId, :path, :content)`,
				{ skillVersionId: id, path: file.path, content: file.content },
			);
		}
		return id;
	}

	/** `createdAt` orders the skills of a published version, so each pin gets its own. */
	private async insertPins(
		context: MigrationContext,
		agentVersionId: string,
		pins: Array<{ skillId: string; skillVersionId: string }>,
	) {
		const { escape, runQuery } = context;
		const columns = ['agentVersionId', 'skillId', 'skillVersionId', 'createdAt']
			.map((name) => escape.columnName(name))
			.join(', ');
		const first = Date.now();
		for (const [index, pin] of pins.entries()) {
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_version_skill_dependency')} (${columns})
				VALUES (:agentVersionId, :skillId, :skillVersionId, :createdAt)`,
				{ agentVersionId, ...pin, createdAt: toTimestamp(context, new Date(first + index)) },
			);
		}
	}

	/** `createdAt` orders the skills of a draft, so each dependency row gets its own. */
	private async insertDependencies(context: MigrationContext, agentId: string, skillIds: string[]) {
		const { escape, runQuery } = context;
		const columns = ['agentId', 'skillId', 'skillVersionId', 'createdAt']
			.map((name) => escape.columnName(name))
			.join(', ');
		const first = Date.now();
		for (const [index, skillId] of skillIds.entries()) {
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_skill_dependency')} (${columns})
				VALUES (:agentId, :skillId, NULL, :createdAt)`,
				{ agentId, skillId, createdAt: toTimestamp(context, new Date(first + index)) },
			);
		}
	}
}

/** The `through` agent id and the retry list of the startup copy, or null when unreadable. */
function parseStartupCopyProgress(
	context: MigrationContext,
	raw: string,
): { through: AgentKey | null; retryAgentIds: Set<string> } | null {
	let progress: unknown;
	try {
		progress = context.parseJson<unknown>(raw);
	} catch {
		return null;
	}
	if (!isRecord(progress)) return null;
	const { through, retryAgentIds } = progress;
	if (!Array.isArray(retryAgentIds) || !retryAgentIds.every((id) => typeof id === 'string')) {
		return null;
	}
	const retry = new Set<string>(retryAgentIds);
	if (through === null) return { through: null, retryAgentIds: retry };
	if (!isRecord(through) || typeof through.id !== 'string') return null;
	const createdAt = toIsoTimestamp(through.createdAt);
	if (!createdAt) return null;
	return { through: { createdAt, id: through.id }, retryAgentIds: retry };
}

/**
 * A timestamp as an ISO string. Postgres returns a `Date`. SQLite returns UTC text such as
 * `2026-01-01 00:00:00.000`, which `Date` would read as local time without the `Z`.
 */
function toIsoTimestamp(value: unknown): string | null {
	let date: Date;
	if (value instanceof Date) date = value;
	else if (typeof value === 'string') {
		date = new Date(/[TZ]/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
	} else return null;
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Whether the agent comes after `through` in (`createdAt`, `id`) order, as the startup copy paged. */
function isAfter(agent: Pick<AgentRow, 'createdAt' | 'id'>, through: AgentKey): boolean {
	const createdAt = toIsoTimestamp(agent.createdAt);
	if (!createdAt) return false;
	if (createdAt !== through.createdAt) return createdAt > through.createdAt;
	return agent.id > through.id;
}

/**
 * The hub content of an inline body, or null for a body the runtime could not load either.
 * Skills ignore `allowedTools`. A repeated file path keeps its first copy.
 */
function toContent(raw: unknown): SkillContent | null {
	if (!isRecord(raw)) return null;
	const { name, description, instructions, references } = raw;
	if (
		typeof name !== 'string' ||
		typeof description !== 'string' ||
		typeof instructions !== 'string'
	) {
		return null;
	}
	const files = new Map<string, SkillFileContent>();
	if (Array.isArray(references)) {
		for (const file of references as unknown[]) {
			if (
				isRecord(file) &&
				typeof file.path === 'string' &&
				typeof file.content === 'string' &&
				!files.has(file.path)
			) {
				files.set(file.path, { path: file.path, content: file.content });
			}
		}
	}
	return { name, description, instructions, frontmatter: null, files: [...files.values()] };
}

/** Keeps one version of each skill for each content: the first one seen, which is the oldest. */
function emptyState(): AgentState {
	return {
		byHash: new Map(),
		skillByRef: new Map(),
		refBySkill: new Map(),
		latest: new Map(),
		owned: new Set(),
	};
}

function addByHash(state: AgentState, hash: string, version: HubVersion) {
	const versions = state.byHash.get(hash) ?? [];
	if (!versions.some((known) => known.skillId === version.skillId)) versions.push(version);
	state.byHash.set(hash, versions);
}

function claim(state: AgentState, refId: string, skillId: string) {
	state.skillByRef.set(refId, skillId);
	state.refBySkill.set(skillId, refId);
}

/**
 * Identity of a version's content, name included. It must give the same value as
 * `skillContentHash` in the agents module, so the app finds these versions by hash.
 */
function contentHash(content: SkillContent): string {
	return createHash('sha256')
		.update(
			JSON.stringify({
				name: content.name,
				description: content.description,
				instructions: content.instructions,
				frontmatter: content.frontmatter ? sortKeys(content.frontmatter) : null,
				files: content.files
					.map((file) => [file.path, file.content])
					.sort(([left], [right]) => compareCodeUnits(left, right)),
			}),
		)
		.digest('hex');
}

/** Plain code-unit order, the same order every reader of `skill_file` uses. */
function compareCodeUnits(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/** Map keys in sorted order at every level, so two equal maps hash the same. List order stays. */
function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => compareCodeUnits(left, right))
			.map(([key, entry]) => [key, sortKeys(entry)]),
	);
}

/**
 * SQLite compares timestamps as text, so write the format TypeORM writes there
 * (`YYYY-MM-DD HH:MM:SS.SSS`, UTC). Rows the app adds later then sort after these.
 */
function toTimestamp(context: MigrationContext, date: Date): Date | string {
	if (!context.isSqlite) return date;
	return date.toISOString().replace('T', ' ').replace('Z', '');
}
