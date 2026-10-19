import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { AgentIntegrationConfig, ListAgentsQueryDto } from '@n8n/api-types';
import {
	BaseRepository,
	chunkIds,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { DataSource, In, IsNull, Not, type SelectQueryBuilder } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import {
	Agent,
	isProjectAgent,
	type ProjectAgent,
	type ProjectScoped,
} from '../entities/agent.entity';

export interface AgentListResult {
	count: number;
	data: ProjectAgent[];
}

export type AgentSummary = ProjectScoped<
	Pick<Agent, 'id' | 'name' | 'projectId' | 'activeVersionId' | 'availableInMCP' | 'updatedAt'>
>;

/** Instance agents are code-defined and read-only, so project queries must not see them. */
const projectScope = 'project' as const;
const projectScopeSql = "agent.scope = 'project'";
/** The same filter for UPDATE builders, which have no `agent` alias. */
const projectScopeUpdateSql = "scope = 'project'";

/** Integration and publication state for channel runtime decisions. */
export type AgentIntegrationState = Pick<Agent, 'integrations' | 'versionId' | 'activeVersionId'>;

export type AgentSummaryFilters = {
	query?: string;
	publishedOnly?: boolean;
	excludeAgentId?: string;
	limit?: number;
};

@Service()
export class AgentRepository extends BaseRepository<Agent> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Agent, dataSource.manager, transactionRunner);
	}

	/**
	 * Insert-only create. `save()` on an entity whose id is already set is an
	 * upsert, so an id minted by the client that already names a row would
	 * update that row instead of colliding on the primary key.
	 */
	async insertNew(agent: Agent, ctx: OperationContext = {}): Promise<void> {
		// `schema` is a free-form JSON column, which QueryDeepPartialEntity
		// cannot express, so cast at this boundary.
		await this.managerFor(ctx).insert(Agent, agent as QueryDeepPartialEntity<Agent>);
	}

	async hasRevision(id: string, revision: number): Promise<boolean> {
		return await this.existsBy({ id, revision });
	}

	async findByProjectId(projectId: string): Promise<ProjectAgent[]> {
		const agents = await this.find({
			where: { projectId, scope: projectScope },
			relations: { activeVersion: true },
			order: { updatedAt: 'DESC' },
		});
		return agents.filter(isProjectAgent);
	}

	async findForExport(
		agentIds: string[],
		projectIds: string[] | null,
		options: { includeActiveVersion: boolean },
	): Promise<ProjectAgent[]> {
		if (agentIds.length === 0 || projectIds?.length === 0) return [];
		// Keep both ID filters below the database parameter limit.
		const projectBatches = projectIds === null ? [null] : chunkIds([...new Set(projectIds)]);
		const agents: ProjectAgent[] = [];
		for (const ids of chunkIds([...new Set(agentIds)])) {
			for (const projects of projectBatches) {
				const found = await this.find({
					where: {
						id: In(ids),
						scope: 'project',
						...(projects === null ? {} : { projectId: In(projects) }),
					},
					relations: { activeVersion: options.includeActiveVersion },
				});
				agents.push(...found.filter(isProjectAgent));
			}
		}
		return agents.sort((left, right) => left.id.localeCompare(right.id));
	}

	async findIdsInProjectsForExport(projectIds: string[]): Promise<string[]> {
		const ids: string[] = [];
		for (const projects of chunkIds([...new Set(projectIds)])) {
			const agents = await this.find({ select: ['id'], where: { projectId: In(projects) } });
			ids.push(...agents.map(({ id }) => id));
		}
		return ids.sort();
	}

	async findExistingIds(agentIds: string[]): Promise<Set<string>> {
		const ids = new Set<string>();
		for (const chunk of chunkIds(agentIds)) {
			const agents = await this.find({ select: ['id'], where: { id: In(chunk) } });
			for (const { id } of agents) ids.add(id);
		}
		return ids;
	}

	/**
	 * Lean listing for search surfaces: selects only summary columns, skipping
	 * the JSON config columns and the activeVersion join, and pushes all
	 * filters and the limit into the query.
	 */
	async findSummariesByProjectIds(
		projectIds: string[] | null,
		options: AgentSummaryFilters = {},
	): Promise<AgentSummary[]> {
		if (projectIds?.length === 0) return [];

		const query = this.createQueryBuilder('agent')
			.select([
				'agent.id',
				'agent.name',
				'agent.projectId',
				'agent.activeVersionId',
				'agent.availableInMCP',
				'agent.updatedAt',
			])
			.where(projectScopeSql)
			.orderBy('agent.updatedAt', 'DESC');

		if (projectIds !== null) {
			query.andWhere('agent.projectId IN (:...projectIds)', { projectIds });
		}
		if (options.query) {
			query.andWhere('LOWER(agent.name) LIKE LOWER(:query)', { query: `%${options.query}%` });
		}
		if (options.publishedOnly) {
			query.andWhere('agent.activeVersionId IS NOT NULL');
		}
		if (options.excludeAgentId) {
			query.andWhere('agent.id != :excludeAgentId', { excludeAgentId: options.excludeAgentId });
		}
		if (options.limit !== undefined) {
			query.take(options.limit);
		}

		return (await query.getMany()).filter(isProjectAgent);
	}

	async findByProjectIdsPaginated(
		projectIds: string[] | null,
		options: ListAgentsQueryDto,
		{
			withProject = false,
			usageCounts,
		}: { withProject?: boolean; usageCounts?: Map<string, number> } = {},
	): Promise<AgentListResult> {
		if (projectIds?.length === 0) return { count: 0, data: [] };

		const query = this.createQueryBuilder('agent').leftJoinAndSelect(
			'agent.activeVersion',
			'activeVersion',
		);

		// Only cross-project consumers (MCP settings) label each agent by its home
		// project; the overview lists don't read it, so they skip the extra join.
		if (withProject) {
			query.leftJoinAndSelect('agent.project', 'project');
		}

		query.where(projectScopeSql);
		if (projectIds !== null) {
			query.andWhere('agent.projectId IN (:...projectIds)', { projectIds });
		}
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy, usageCounts);
		query.skip(options.skip).take(options.take);

		const [data, count] = await query.getManyAndCount();
		return { count, data: data.filter(isProjectAgent) };
	}

	/**
	 * Adds the shared n8n Chat reachability predicate to an already-started
	 * `agent` query: the given projects (or any, when `projectIds` is null)
	 * and {@link applyFilters}'s `availableInChat` predicate. Callers add their
	 * own `where` first — this only appends `andWhere` clauses, so it never
	 * discards a condition a caller already set. Shared by
	 * `findChatReachableIds` and `findChatReachableById` so both stay in
	 * lockstep with each other and with the chat agent list.
	 */
	private chatReachableQuery(
		query: SelectQueryBuilder<Agent>,
		projectIds: string[] | null,
	): SelectQueryBuilder<Agent> {
		query.andWhere(projectScopeSql);
		if (projectIds !== null) {
			query.andWhere('agent.projectId IN (:...projectIds)', { projectIds });
		}
		this.applyFilters(query, { availableInChat: true });
		return query;
	}

	/** Ids of the agents the user can reach over n8n Chat: published config carries the channel. */
	async findChatReachableIds(projectIds: string[] | null): Promise<string[]> {
		if (projectIds?.length === 0) return [];

		// `availableInChat` reads `activeVersion.schema`, so the join must exist
		// even though the select list drops it again.
		const query = this.createQueryBuilder('agent')
			.leftJoin('agent.activeVersion', 'activeVersion')
			.select(['agent.id']);

		const rows = await this.chatReachableQuery(query, projectIds).getMany();
		return rows.map((row) => row.id);
	}

	/**
	 * One agent reachable over n8n Chat: in one of the given projects (or any
	 * project, when `projectIds` is null) and its published config carries the
	 * channel. Loads `project` too — the chat page labels the agent with it.
	 */
	async findChatReachableById(
		id: string,
		projectIds: string[] | null,
	): Promise<ProjectAgent | null> {
		if (projectIds?.length === 0) return null;

		const query = this.createQueryBuilder('agent')
			.leftJoinAndSelect('agent.activeVersion', 'activeVersion')
			.leftJoinAndSelect('agent.project', 'project')
			.where('agent.id = :id', { id });

		return projectAgentOrNull(await this.chatReachableQuery(query, projectIds).getOne());
	}

	private applyFilters(
		query: SelectQueryBuilder<Agent>,
		filter: ListAgentsQueryDto['filter'],
	): void {
		if (filter?.query) {
			query.andWhere('LOWER(agent.name) LIKE LOWER(:query)', { query: `%${filter.query}%` });
		}
		if (filter?.ids) {
			query.andWhere('agent.id IN (:...ids)', { ids: filter.ids });
		}
		if (filter?.availableInMCP !== undefined) {
			query.andWhere('agent.availableInMCP = :availableInMCP', {
				availableInMCP: filter.availableInMCP,
			});
		}
		if (filter?.availableInChat !== undefined) {
			// Reachability is a property of the **published** config, not the draft:
			// publish is what moves the channel live, and a draft edit must not change
			// what production chat serves (see `AgentRepository.isN8nChatPublished`).
			// So this reads `activeVersion.schema.integrations`, which also makes a
			// separate `activeVersionId IS NOT NULL` check unnecessary — an agent with
			// no active version has no snapshot to match.
			// The column is JSON, so the predicate walks the array with each dialect's
			// own functions and compares each entry's `type`. A text match over the
			// column would also hit the literal elsewhere in it, in a Telegram
			// allowlist entry of the same name for one. The match stays in SQL (not
			// filtered in memory, unlike `findByIntegrationCredential`) so `count` and
			// pagination stay correct. `COALESCE` keeps a missing or null `schema` out
			// of the JSON functions, which reject a non-array argument.
			const isPostgres = this.manager.connection.options.type === 'postgres';
			const publishedChannels = isPostgres
				? 'COALESCE("activeVersion"."schema"->\'integrations\', \'[]\'::json)'
				: 'COALESCE(json_extract("activeVersion"."schema", \'$.integrations\'), \'[]\')';
			const carriesChannel = isPostgres
				? `EXISTS (SELECT 1 FROM json_array_elements(${publishedChannels}) AS integration ` +
					"WHERE integration->>'type' = :n8nChatType)"
				: `EXISTS (SELECT 1 FROM json_each(${publishedChannels}) AS integration ` +
					"WHERE json_extract(integration.value, '$.type') = :n8nChatType)";
			query.andWhere(filter.availableInChat ? carriesChannel : `NOT (${carriesChannel})`, {
				n8nChatType: N8N_CHAT_INTEGRATION_TYPE,
			});
		}
	}

	private applySorting(
		query: SelectQueryBuilder<Agent>,
		sortBy?: ListAgentsQueryDto['sortBy'],
		usageCounts?: Map<string, number>,
	): void {
		const [field = 'updatedAt', direction = 'desc'] = sortBy?.split(':') ?? [];
		const sortDirection = direction.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

		if (field === 'name') {
			query
				.addSelect('LOWER(agent.name)', 'agent_name_lower')
				.orderBy('agent_name_lower', sortDirection);
			return;
		}

		if (field === 'usage') {
			this.applyUsageSorting(query, usageCounts);
			return;
		}

		query.orderBy(`agent.${field}`, sortDirection);
	}

	/**
	 * Ranks by each agent's pre-counted n8n Chat thread usage, so the agents the
	 * chat user actually talks to rise to the top. Ties (including agents with
	 * no usage) fall back to `createdAt` DESC, then `id` DESC.
	 */
	private applyUsageSorting(
		query: SelectQueryBuilder<Agent>,
		usageCounts?: Map<string, number>,
	): void {
		if (!usageCounts || usageCounts.size === 0) {
			query.orderBy('agent.createdAt', 'DESC').addOrderBy('agent.id', 'DESC');
			return;
		}

		const agentIds = [...usageCounts.keys()];
		const cases = agentIds.map((_, i) => `WHEN :usageAgent${i} THEN :usageCount${i}`).join(' ');
		agentIds.forEach((id, i) => {
			query.setParameter(`usageAgent${i}`, id).setParameter(`usageCount${i}`, usageCounts.get(id));
		});

		query
			.addSelect(`CASE agent.id ${cases} ELSE 0 END`, 'agent_usage_count')
			.orderBy('agent_usage_count', 'DESC')
			.addOrderBy('agent.createdAt', 'DESC')
			.addOrderBy('agent.id', 'DESC');
	}

	/**
	 * Finds an agent by ID and project ID, eagerly loading its `activeVersion` relation.
	 *
	 * TypeORM does not load relations by default — without `relations: { activeVersion: true }`,
	 * `agent.activeVersion` would always be `undefined` even if a row exists in
	 * `agent_history`. The eager load is needed so the frontend receives the full
	 * published snapshot (or `null`) in a single query, which is what the publish button uses
	 * to compute its state (published vs. unpublished, has changes vs. up to date).
	 */
	async findByIdAndProjectId(id: string, projectId: string): Promise<ProjectAgent | null> {
		return projectAgentOrNull(
			await this.findOne({
				where: { id, projectId, scope: projectScope },
				relations: { activeVersion: true },
			}),
		);
	}

	async isN8nChatPublished(id: string, projectId: string): Promise<boolean> {
		const agent = await this.findByIdAndProjectId(id, projectId);
		return (
			agent?.activeVersion?.schema?.integrations?.some(
				(integration) => integration.type === N8N_CHAT_INTEGRATION_TYPE,
			) ?? false
		);
	}

	/**
	 * Finds an agent by ID alone. Agent IDs are globally unique, so this is safe
	 * for callers whose access check does not hinge on a specific project (e.g.
	 * users with global agent scopes). Returns no instance agent.
	 */
	async findById(id: string): Promise<ProjectAgent | null> {
		return projectAgentOrNull(
			await this.findOne({
				where: { id, scope: projectScope },
				relations: { activeVersion: true },
			}),
		);
	}

	/**
	 * Creates or renames the row of a code-defined instance agent. The row
	 * anchors threads, executions and queue items through foreign keys. It
	 * stores no config, because the runtime comes from code.
	 */
	async ensureInstanceAgent(id: string, name: string): Promise<void> {
		// Two mains can start at the same time: the second insert of the id must not fail.
		await this.createQueryBuilder()
			.insert()
			.into(Agent)
			.values({ id, name, scope: 'instance', projectId: null, schema: null })
			.orIgnore()
			.execute();
		const existing = await this.findOneOrFail({ select: ['id', 'name', 'scope'], where: { id } });
		if (existing.scope !== 'instance') {
			throw new UnexpectedError(`Agent "${id}" exists as a project agent`);
		}
		if (existing.name !== name) {
			await this.update({ id, scope: 'instance' }, { name });
		}
	}

	async findDependencyIndexAgentIdsBatch(
		afterId: string | null,
		batchSize: number,
	): Promise<Array<Pick<Agent, 'id'>>> {
		const query = this.createQueryBuilder('agent')
			.select(['agent.id'])
			.where(projectScopeSql)
			.orderBy('agent.id', 'ASC')
			.take(batchSize);

		if (afterId !== null) {
			query.andWhere('agent.id > :afterId', { afterId });
		}

		return await query.getMany();
	}

	async findSummariesByIds(
		ids: string[],
	): Promise<Array<ProjectScoped<Pick<Agent, 'id' | 'name' | 'projectId'>>>> {
		if (ids.length === 0) return [];

		const agents = await this.find({
			select: ['id', 'name', 'projectId'],
			where: { id: In(ids), scope: projectScope },
		});
		return agents.filter(isProjectAgent);
	}

	async findByIdInProjects(id: string, projectIds: string[]): Promise<ProjectAgent | null> {
		if (projectIds.length === 0) return null;
		return projectAgentOrNull(
			await this.findOne({
				where: { id, projectId: In(projectIds), scope: projectScope },
				relations: { activeVersion: true },
			}),
		);
	}

	/** Ownership check only — skips `findByIdAndProjectId`'s `activeVersion` load. */
	async existsByIdAndProjectId(id: string, projectId: string): Promise<boolean> {
		return await this.exists({ where: { id, projectId, scope: projectScope } });
	}

	/** Lightweight project-id lookup — avoids loading the full agent config. */
	async getProjectIdById(id: string): Promise<string | null> {
		const result = await this.findOne({
			select: ['projectId'],
			where: { id, scope: projectScope },
		});
		return result?.projectId ?? null;
	}

	/** Name and home project for the budget-alert email. Skips the config JSON. */
	async findBudgetAlertTarget(
		id: string,
	): Promise<ProjectScoped<Pick<Agent, 'name' | 'projectId'>> | null> {
		const agent = await this.findOne({
			select: ['name', 'projectId'],
			where: { id, scope: projectScope },
		});
		if (!agent || !isProjectAgent(agent)) return null;
		return { name: agent.name, projectId: agent.projectId };
	}

	async findByIdsAndProjectId(
		ids: string[],
		projectId: string,
	): Promise<Array<Pick<Agent, 'id' | 'name' | 'activeVersionId'>>> {
		if (ids.length === 0) return [];
		return await this.find({
			select: ['id', 'name', 'activeVersionId'],
			where: { id: In(ids), projectId, scope: projectScope },
		});
	}

	async findMcpAvailabilityCandidates(
		where: { ids: string[] } | { projectIds: string[] } | { all: true },
	): Promise<Array<ProjectScoped<Pick<Agent, 'id' | 'projectId' | 'availableInMCP'>>>> {
		if ('ids' in where && where.ids.length === 0) return [];
		if ('projectIds' in where && where.projectIds.length === 0) return [];

		const criteria =
			'ids' in where
				? { id: In(where.ids), scope: projectScope }
				: 'projectIds' in where
					? { projectId: In(where.projectIds), scope: projectScope }
					: { scope: projectScope };

		const agents = await this.find({
			select: ['id', 'projectId', 'availableInMCP'],
			where: criteria,
		});
		return agents.filter(isProjectAgent);
	}

	async setAvailableInMCP(agentIds: string[], availableInMCP: boolean): Promise<void> {
		if (agentIds.length === 0) return;
		await this.update({ id: In(agentIds), scope: projectScope }, { availableInMCP });
	}

	/**
	 * Claims the once-per-agent setup-completion marker. Returns true only for
	 * the caller that actually set it, so concurrent writers that all saw the
	 * marker unset cannot each report the milestone.
	 */
	async claimSetupCompleted(id: string, completedAt: Date): Promise<boolean> {
		const result = await this.update(
			{ id, scope: projectScope, setupCompletedAt: IsNull() },
			{ setupCompletedAt: completedAt },
		);

		return (result.affected ?? 0) > 0;
	}

	/** Read current channel state without loading the agent definition. */
	async findIntegrationState(id: string): Promise<AgentIntegrationState | null> {
		return await this.findOne({
			select: ['integrations', 'versionId', 'activeVersionId'],
			where: { id, scope: projectScope },
		});
	}

	/**
	 * Fence channel changes against draft and publication writes.
	 * Advance the revision so stale draft saves cannot overwrite the channels.
	 * Return false on a conflict so the caller can reapply its delta to fresh state.
	 */
	async updateIntegrations(
		id: string,
		integrations: AgentIntegrationConfig[],
		expected: Pick<Agent, 'revision' | 'versionId' | 'activeVersionId'>,
		versionId: string | null,
	): Promise<boolean> {
		const result = await this.update(
			{
				id,
				scope: projectScope,
				revision: expected.revision,
				versionId: expected.versionId ?? IsNull(),
				activeVersionId: expected.activeVersionId ?? IsNull(),
			},
			{ integrations, versionId, revision: () => 'revision + 1' },
		);

		return (result.affected ?? 0) > 0;
	}

	async findPublished(): Promise<ProjectAgent[]> {
		const agents = await this.createQueryBuilder('agent')
			.innerJoinAndSelect('agent.activeVersion', 'activeVersion')
			.where(projectScopeSql)
			.getMany();
		return agents.filter(isProjectAgent);
	}

	/** The ids of all agents with a published version. Loads no version rows. */
	async findPublishedAgentIds(): Promise<string[]> {
		const rows = await this.find({
			where: { activeVersionId: Not(IsNull()), scope: projectScope },
			select: ['id'],
		});
		return rows.map((row) => row.id);
	}

	/**
	 * The published version id of an agent, or `null` when the agent is missing
	 * or unpublished. Loads no version row, so callers that only need the id do
	 * not pay for the version's JSON columns.
	 */
	async findActiveVersionId(agentId: string): Promise<string | null> {
		const row = await this.findOne({
			where: { id: agentId, scope: projectScope },
			select: ['id', 'activeVersionId'],
		});
		return row?.activeVersionId ?? null;
	}

	/** The ids, from the given list, that belong to an agent with a published version. */
	async findPublishedIds(agentIds: string[]): Promise<Set<string>> {
		if (agentIds.length === 0) return new Set();

		const rows = await this.find({
			where: { id: In(agentIds), activeVersionId: Not(IsNull()), scope: projectScope },
			select: ['id'],
		});
		return new Set(rows.map((row) => row.id));
	}

	/**
	 * Finds agents whose `integrations` JSON column contains an entry matching the
	 * given `type` + `credentialId`, anywhere on the instance, excluding
	 * `excludeAgentId`.
	 *
	 * Instance-wide, unlike `findByIntegrationCredential`: a vendor app such as an
	 * Entra or Slack registration is bound to one bot at the vendor, so an agent
	 * in another project breaks a setup just as surely as one in this project.
	 *
	 * Reads only the columns the predicate and the caller need, so an instance
	 * with large agent configurations does not transfer and parse all of them.
	 */
	async findByIntegrationCredentialAnyProject(
		type: string,
		credentialId: string,
		excludeAgentId: string,
	): Promise<Array<Pick<Agent, 'id' | 'name' | 'integrations'>>> {
		const agents = await this.find({
			select: ['id', 'name', 'integrations'],
			where: { scope: projectScope },
		});
		return agents.filter(
			(agent) =>
				agent.id !== excludeAgentId &&
				(agent.integrations ?? []).some((i) => i.type === type && i.credentialId === credentialId),
		);
	}

	/**
	 * Finds every agent with a channel of the given type in its `integrations`
	 * JSON column. The `LIKE` is a portable pre-filter; it can match another
	 * field, so the exact check still runs in memory.
	 */
	async findWithIntegrationType(type: string): Promise<Array<Pick<Agent, 'id' | 'integrations'>>> {
		const agents = await this.createQueryBuilder('agent')
			.select(['agent.id', 'agent.integrations'])
			.where(`CAST(agent.integrations AS TEXT) LIKE :pattern ${LIKE_ESCAPE_CLAUSE}`, {
				pattern: `%${escapeLike(JSON.stringify(type))}%`,
			})
			.getMany();
		return agents.filter((agent) => (agent.integrations ?? []).some((i) => i.type === type));
	}

	/**
	 * Finds agents within a project whose `integrations` JSON column contains an
	 * entry matching the given `type` + `credentialId`, excluding `excludeAgentId`.
	 *
	 * Scoped to a single project because credentials are project-scoped in n8n —
	 * an agent can only use credentials from its own project, so conflicts can
	 * only occur between agents in the same project.
	 *
	 * Filters in memory because `integrations` is a JSON column with no portable
	 * SQL query across SQLite/Postgres/MySQL. Agent counts per project are small
	 * enough that this is fine.
	 */
	async findByIntegrationCredential(
		type: string,
		credentialId: string,
		projectId: string,
		excludeAgentId: string,
	): Promise<ProjectAgent[]> {
		const agents = await this.find({ where: { projectId, scope: projectScope } });
		return agents
			.filter(isProjectAgent)
			.filter(
				(agent) =>
					agent.id !== excludeAgentId &&
					(agent.integrations ?? []).some(
						(i) => i.type === type && i.credentialId === credentialId,
					),
			);
	}

	/**
	 * Atomically advances publication state only when the row's `revision` still
	 * matches the value the caller observed at load — the optimistic revision
	 * fence for publish/unpublish. Writes only the publication-owned columns
	 * (`activeVersionId`, `versionId`) and bumps `revision`, so a concurrent
	 * draft edit (autosave) that bumped `revision` in between makes this affect
	 * zero rows instead of clobbering the newer draft. Returns whether this
	 * caller won the fence.
	 */
	async setActiveVersionFenced(
		id: string,
		expectedRevision: number,
		next: { activeVersionId: string | null; versionId: string },
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(Agent)
			.set({
				activeVersionId: next.activeVersionId,
				versionId: next.versionId,
				revision: () => 'revision + 1',
			})
			.where('id = :id AND revision = :expected', { id, expected: expectedRevision })
			.andWhere(projectScopeUpdateSql)
			.execute();
		return (result.affected ?? 0) > 0;
	}

	/**
	 * Persists a draft edit behind the same optimistic revision fence as
	 * publish/unpublish. Writes only the draft-owned columns and bumps
	 * `revision` in SQL, so it can neither clobber `activeVersionId` written by
	 * a concurrent publish nor mask that publish by writing a stale in-memory
	 * revision over the row. On a win the in-memory entity's `revision` and
	 * `updatedAt` are synced to what was written. Returns whether this caller
	 * won the fence.
	 */
	async saveDraftFenced(agent: Agent, ctx: OperationContext = {}): Promise<boolean> {
		const expectedRevision = agent.revision;
		// Written explicitly (instead of the builder's CURRENT_TIMESTAMP default)
		// so the in-memory entity can report the exact persisted timestamp.
		const updatedAt = new Date();
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(Agent)
			.set({
				name: agent.name,
				schema: agent.schema,
				integrations: agent.integrations,
				tools: agent.tools,
				skills: agent.skills,
				versionId: agent.versionId,
				updatedAt,
				revision: () => 'revision + 1',
			})
			.where('id = :id AND revision = :expected', { id: agent.id, expected: expectedRevision })
			.andWhere(projectScopeUpdateSql)
			.execute();
		const won = (result.affected ?? 0) > 0;
		if (won) {
			agent.revision = expectedRevision + 1;
			agent.updatedAt = updatedAt;
		}
		return won;
	}

	/**
	 * A skill that these agents follow got a new saved version. Give each agent that is in
	 * sync with its published version a new draft version id, so it shows unpublished
	 * changes. One conditional UPDATE per agent and no read first, so a concurrent draft
	 * edit cannot make the skill save fail. `revision` does not move: a draft edit also
	 * moves `versionId` away from `activeVersionId`, so neither write undoes the other.
	 * Returns the agents it changed.
	 */
	async markDraftChangedIfInSync(
		agentIds: string[],
		ctx: OperationContext = {},
	): Promise<string[]> {
		const changed: string[] = [];
		for (const id of agentIds) {
			const result = await this.managerFor(ctx)
				.createQueryBuilder()
				.update(Agent)
				.set({ versionId: randomUUID() })
				.where('id = :id', { id })
				.andWhere('"versionId" = "activeVersionId"')
				.andWhere(projectScopeUpdateSql)
				.execute();
			if ((result.affected ?? 0) > 0) changed.push(id);
		}
		return changed;
	}

	/**
	 * One page of agent keys, oldest first, for the startup skill copy. Pages by the last
	 * row seen, so an agent deleted meanwhile cannot shift later agents past the next page.
	 */
	async findPageForSkillCopy(
		after: Pick<Agent, 'createdAt' | 'id'> | null,
		take: number,
		ctx: OperationContext = {},
	): Promise<Array<Pick<Agent, 'id' | 'createdAt'>>> {
		const query = this.managerFor(ctx)
			.createQueryBuilder(Agent, 'agent')
			.select(['agent.id', 'agent.createdAt'])
			.orderBy('agent.createdAt', 'ASC')
			.addOrderBy('agent.id', 'ASC')
			.limit(take);
		if (after) {
			query.where(
				'(agent.createdAt > :createdAt OR (agent.createdAt = :createdAt AND agent.id > :id))',
				{
					createdAt: after.createdAt,
					id: after.id,
				},
			);
		}
		return await query.getMany();
	}

	/** The inline skill columns of one agent, for the startup skill copy. */
	async findForSkillCopy(
		agentId: string,
		ctx: OperationContext = {},
	): Promise<Pick<Agent, 'id' | 'schema' | 'skills'> | null> {
		return await this.managerFor(ctx).findOne(Agent, {
			select: ['id', 'schema', 'skills'],
			where: { id: agentId },
		});
	}

	/**
	 * Holds the agent row until the transaction ends, so a draft write to the agent waits
	 * for the startup skill copy of it. SQLite allows one write transaction at a time.
	 */
	async lockForSkillCopy(agentId: string, ctx: OperationContext): Promise<void> {
		if (this.manager.connection.options.type !== 'postgres') return;
		await this.managerFor(ctx).find(Agent, {
			select: ['id'],
			where: { id: agentId },
			lock: { mode: 'pessimistic_write' },
		});
	}

	/** The project of each agent, to send an update push to the right project. */
	async findProjectIdsByIds(
		ids: string[],
		ctx: OperationContext = {},
	): Promise<Array<ProjectScoped<Pick<Agent, 'id' | 'projectId'>>>> {
		const agents: Array<Pick<Agent, 'id' | 'projectId'>> = [];
		// In batches: a skill can have more followers than SQLite allows bound parameters.
		for (const chunk of chunkIds([...new Set(ids)])) {
			agents.push(
				...(await this.managerFor(ctx).find(Agent, {
					where: { id: In(chunk) },
					select: ['id', 'projectId'],
				})),
			);
		}
		return agents.filter(isProjectAgent);
	}

	/**
	 * Write the `schema` column of a draft. Write `updatedAt` too, with the value
	 * from the fenced save: without it, TypeORM sets `CURRENT_TIMESTAMP`. This
	 * write does not check `revision`: call it only in the same transaction as a
	 * won `saveDraftFenced`.
	 */
	async updateDraftSkills(
		agent: Pick<Agent, 'id' | 'schema' | 'skills' | 'updatedAt'>,
		ctx: OperationContext,
	): Promise<void> {
		// Write `updatedAt` too, with the value of the fenced save: without it, TypeORM
		// sets `CURRENT_TIMESTAMP`, which drops the milliseconds on SQLite.
		await this.managerFor(ctx)
			.createQueryBuilder()
			.update(Agent)
			.set({ schema: agent.schema, skills: agent.skills, updatedAt: agent.updatedAt })
			.where('id = :id', { id: agent.id })
			.andWhere(projectScopeUpdateSql)
			.execute();
	}

	async updateDraftSchema(
		agent: Pick<Agent, 'id' | 'schema' | 'updatedAt'>,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx)
			.createQueryBuilder()
			.update(Agent)
			.set({ schema: agent.schema, updatedAt: agent.updatedAt })
			.where('id = :id', { id: agent.id })
			.andWhere(projectScopeUpdateSql)
			.execute();
	}
}

function projectAgentOrNull(agent: Agent | null): ProjectAgent | null {
	return agent && isProjectAgent(agent) ? agent : null;
}
