import { BaseRepository, TransactionRunner, chunkIds, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, type EntityManager } from '@n8n/typeorm';

import { AgentPublishHistory } from '../entities/agent-publish-history.entity';
import { AgentHistory } from '../entities/agent-history.entity';
import { AgentSkillDependency } from '../entities/agent-skill-dependency.entity';
import { AgentVersionSkillDependency } from '../entities/agent-version-skill-dependency.entity';
import { Agent, isProjectAgent, type ProjectScoped } from '../entities/agent.entity';

/** A skill ref of an agent draft. A ref with `versionId` is pinned to that saved version. */
export type SkillDependencyRef = { skillId: string; versionId?: string | null };

type UsingAgent = { agentId: string; agentName: string; projectId: string };

/**
 * The agents that use a skill. A draft carries the skill version its ref pins, or null when
 * it follows the latest. A pin carries the skill version that the active published version
 * of its agent pins, or null.
 */
export type SkillUsageRows = {
	drafts: Array<UsingAgent & { skillVersionId: string | null }>;
	pins: Array<UsingAgent & { skillVersionId: string | null }>;
	hiddenAgents: number;
};

/**
 * Persistence for the agent side of skills: the skill refs of agent drafts, the pins of
 * published agent versions, and the agents that use skills. The skills themselves live in
 * the skills module.
 */
@Service()
export class AgentSkillRepository extends BaseRepository<AgentSkillDependency> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentSkillDependency, dataSource.manager, transactionRunner);
	}

	/**
	 * The pins of one published agent version: the skill version of each skill, in the
	 * order of the draft refs at publish.
	 */
	async findPins(
		agentVersionId: string,
		ctx: OperationContext = {},
	): Promise<Array<{ skillId: string; skillVersionId: string }>> {
		const pins = await this.managerFor(ctx).find(AgentVersionSkillDependency, {
			select: ['skillId', 'skillVersionId'],
			where: { agentVersionId },
			order: { createdAt: 'ASC' },
		});
		return pins.map(({ skillId, skillVersionId }) => ({ skillId, skillVersionId }));
	}

	/**
	 * The skill ids one published agent version pins, in the order of the draft refs at
	 * publish. Reads no version or file rows.
	 */
	async findPinnedSkillIds(agentVersionId: string, ctx: OperationContext = {}): Promise<string[]> {
		const pins = await this.managerFor(ctx).find(AgentVersionSkillDependency, {
			select: ['skillId'],
			where: { agentVersionId },
			order: { createdAt: 'ASC' },
		});
		return pins.map((pin) => pin.skillId);
	}

	/**
	 * Inserts the pins of one publish in the given order. `createdAt` orders the skills of
	 * a published version, so each pin gets its own timestamp, like `replaceDependencies`.
	 */
	async insertPins(
		pins: Array<{ agentVersionId: string; skillId: string; skillVersionId: string }>,
		ctx: OperationContext = {},
	): Promise<void> {
		if (pins.length === 0) return;
		const first = Date.now();
		await this.managerFor(ctx).insert(
			AgentVersionSkillDependency,
			pins.map((pin, index) => ({ ...pin, createdAt: new Date(first + index) })),
		);
	}

	/**
	 * Sets the dependency rows of one agent to these refs. The caller passes refs to
	 * existing skills only. A row that stays keeps its `createdAt`, which orders an agent's skills, and
	 * new rows sort after it in the given order. When one skill has a following ref and a
	 * pinned ref, the following ref wins, because the draft then runs the latest version.
	 */
	async replaceDependencies(
		agentId: string,
		refs: SkillDependencyRef[],
		ctx: OperationContext = {},
	): Promise<void> {
		const pinBySkill = new Map<string, string | null>();
		for (const ref of refs) {
			if (pinBySkill.get(ref.skillId) === null) continue;
			pinBySkill.set(ref.skillId, ref.versionId ?? null);
		}
		await this.runInTransaction(ctx, async (manager) => {
			const current = await manager.find(AgentSkillDependency, { where: { agentId } });
			const removed = current.filter((row) => !pinBySkill.has(row.skillId));
			if (removed.length > 0) {
				await manager.delete(AgentSkillDependency, {
					agentId,
					skillId: In(removed.map((row) => row.skillId)),
				});
			}
			const kept = new Map(current.map((row) => [row.skillId, row]));
			for (const [skillId, skillVersionId] of pinBySkill) {
				const row = kept.get(skillId);
				if (row && row.skillVersionId !== skillVersionId) {
					await manager.update(AgentSkillDependency, { agentId, skillId }, { skillVersionId });
				}
			}
			const added = [...pinBySkill].filter(([skillId]) => !kept.has(skillId));
			if (added.length === 0) return;
			// One insert gives every row the same timestamp, so each new row gets its own.
			const newest = Math.max(Date.now(), ...current.map((row) => row.createdAt.getTime() + 1));
			await manager.insert(
				AgentSkillDependency,
				added.map(([skillId, skillVersionId], index) => ({
					agentId,
					skillId,
					skillVersionId,
					createdAt: new Date(newest + index),
				})),
			);
		});
	}

	/** Agents whose draft follows the skill (no pin). */
	async findFollowingAgents(
		skillId: string,
		ctx: OperationContext = {},
	): Promise<Array<Pick<Agent, 'id' | 'name'>>> {
		const agentIds = await this.findFollowingAgentIds([skillId], ctx);
		if (agentIds.length === 0) return [];
		return await this.managerFor(ctx).find(Agent, {
			where: { id: In(agentIds) },
			select: ['id', 'name'],
		});
	}

	/** The skill refs of each agent's draft, in the order they were attached. */
	async findDependencies(
		agentIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, Array<{ skillId: string; versionId: string | null }>>> {
		if (agentIds.length === 0) return new Map();
		const rows = await this.managerFor(ctx).find(AgentSkillDependency, {
			where: { agentId: In(unique(agentIds)) },
			order: { createdAt: 'ASC' },
		});
		const result = new Map<string, Array<{ skillId: string; versionId: string | null }>>();
		for (const row of rows) {
			const refs = result.get(row.agentId) ?? [];
			refs.push({ skillId: row.skillId, versionId: row.skillVersionId });
			result.set(row.agentId, refs);
		}
		return result;
	}

	/** Ids of the agents whose draft follows any of these skills (no pin). */
	async findFollowingAgentIds(skillIds: string[], ctx: OperationContext = {}): Promise<string[]> {
		if (skillIds.length === 0) return [];
		const rows = await this.managerFor(ctx).find(AgentSkillDependency, {
			where: { skillId: In(unique(skillIds)), skillVersionId: IsNull() },
		});
		return unique(rows.map((row) => row.agentId));
	}

	/**
	 * "Used by": each agent that uses the skill once, as a draft ref, as a published pin, or
	 * both. A pin row shows the version the agent's current published version runs, or
	 * null when only older published versions use the skill. Agents outside `projectIds`
	 * are only counted. The read grows with the agents, not with their publishes.
	 */
	async findUsage(
		skillId: string,
		projectIds: string[] | 'all' = 'all',
		ctx: OperationContext = {},
	): Promise<SkillUsageRows> {
		const manager = this.managerFor(ctx);
		const drafted = await manager
			.createQueryBuilder(Agent, 'agent')
			.innerJoin(AgentSkillDependency, 'dep', 'dep.agentId = agent.id')
			.where('dep.skillId = :skillId', { skillId })
			.select('agent.id', 'id')
			.addSelect('agent.name', 'name')
			.addSelect('agent.projectId', 'projectId')
			.addSelect('dep.skillVersionId', 'skillVersionId')
			.getRawMany<{
				id: string;
				name: string;
				projectId: string | null;
				skillVersionId: string | null;
			}>()
			.then((rows) => rows.filter(isProjectAgent));
		const published = await manager
			.createQueryBuilder(Agent, 'agent')
			.where((qb) => {
				const pinned = qb
					.subQuery()
					.select('history.agentId')
					.from(AgentHistory, 'history')
					.innerJoin(AgentVersionSkillDependency, 'pin', 'pin.agentVersionId = history.versionId')
					.innerJoin(
						AgentPublishHistory,
						'publication',
						"publication.versionId = history.versionId AND publication.event = 'activated'",
					)
					.where('pin.skillId = :skillId')
					.getQuery();
				return `agent.id IN ${pinned}`;
			})
			.setParameter('skillId', skillId)
			.select(['agent.id', 'agent.name', 'agent.projectId', 'agent.activeVersionId'])
			.getMany()
			.then((agents) => agents.filter(isProjectAgent));

		const isVisible = (agent: ProjectScoped<Pick<Agent, 'projectId'>>) =>
			projectIds === 'all' || projectIds.includes(agent.projectId);
		const hidden = new Set(
			[...drafted, ...published].filter((agent) => !isVisible(agent)).map((agent) => agent.id),
		);
		const visiblePublished = published.filter(isVisible);
		const activePins = await this.findActivePins(
			skillId,
			visiblePublished.flatMap((agent) => (agent.activeVersionId ? [agent.activeVersionId] : [])),
			manager,
		);
		return {
			drafts: drafted.filter(isVisible).map((agent) => ({
				agentId: agent.id,
				agentName: agent.name,
				projectId: agent.projectId,
				skillVersionId: agent.skillVersionId,
			})),
			pins: visiblePublished.map((agent) => ({
				agentId: agent.id,
				agentName: agent.name,
				projectId: agent.projectId,
				skillVersionId: activePins.get(agent.activeVersionId ?? '') ?? null,
			})),
			hiddenAgents: hidden.size,
		};
	}

	/** The agents that use the skill: a draft ref or a published pin. */
	async findUsingAgentIds(skillId: string, ctx: OperationContext = {}): Promise<string[]> {
		const manager = this.managerFor(ctx);
		const drafts = await manager.find(AgentSkillDependency, {
			select: ['agentId'],
			where: { skillId },
		});
		const pins = await manager
			.createQueryBuilder(AgentVersionSkillDependency, 'pin')
			.innerJoin(AgentHistory, 'history', 'history.versionId = pin.agentVersionId')
			.innerJoin(
				AgentPublishHistory,
				'publication',
				"publication.versionId = history.versionId AND publication.event = 'activated'",
			)
			.where('pin.skillId = :skillId', { skillId })
			.select('history.agentId', 'agentId')
			.distinct(true)
			.getRawMany<{ agentId: string }>();
		return unique([...drafts, ...pins].map((row) => row.agentId));
	}

	/** The skills one agent uses: a draft ref or a pin of any of its published versions. */
	async findSkillIdsUsedByAgent(agentId: string, ctx: OperationContext = {}): Promise<string[]> {
		const manager = this.managerFor(ctx);
		const drafts = await manager.find(AgentSkillDependency, {
			select: ['skillId'],
			where: { agentId },
		});
		const pins = await manager
			.createQueryBuilder(AgentVersionSkillDependency, 'pin')
			.innerJoin(AgentHistory, 'history', 'history.versionId = pin.agentVersionId')
			.innerJoin(
				AgentPublishHistory,
				'publication',
				"publication.versionId = history.versionId AND publication.event = 'activated'",
			)
			.where('history.agentId = :agentId', { agentId })
			.select('pin.skillId', 'skillId')
			.distinct(true)
			.getRawMany<{ skillId: string }>();
		return unique([...drafts, ...pins].map((row) => row.skillId));
	}

	/** Distinct agents per skill, drafts and pins together. Skills nobody uses are left out. */
	async countUsingAgents(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		const manager = this.managerFor(ctx);
		const pairs = await inChunks(skillIds, async (chunk) => {
			const drafts = await manager.find(AgentSkillDependency, {
				select: ['skillId', 'agentId'],
				where: { skillId: In(chunk) },
			});
			const pins = await manager
				.createQueryBuilder(AgentVersionSkillDependency, 'pin')
				.innerJoin(AgentHistory, 'history', 'history.versionId = pin.agentVersionId')
				.innerJoin(
					AgentPublishHistory,
					'publication',
					"publication.versionId = history.versionId AND publication.event = 'activated'",
				)
				.where('pin.skillId IN (:...chunk)', { chunk })
				.select('pin.skillId', 'skillId')
				.addSelect('history.agentId', 'agentId')
				.distinct(true)
				.getRawMany<{ skillId: string; agentId: string }>();
			return [...drafts, ...pins];
		});
		const agentsBySkill = new Map<string, Set<string>>();
		for (const { skillId, agentId } of pairs) {
			agentsBySkill.set(skillId, (agentsBySkill.get(skillId) ?? new Set()).add(agentId));
		}
		return new Map([...agentsBySkill].map(([skillId, agents]) => [skillId, agents.size]));
	}

	/** Name and project of each agent, keyed by agent id. */
	async findAgents(
		agentIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, ProjectScoped<Pick<Agent, 'name' | 'projectId'>>>> {
		const manager = this.managerFor(ctx);
		const agents = await inChunks(
			agentIds,
			async (chunk) =>
				await manager.find(Agent, {
					where: { id: In(chunk) },
					select: ['id', 'name', 'projectId'],
				}),
		);
		return new Map(
			agents.filter(isProjectAgent).map(({ id, name, projectId }) => [id, { name, projectId }]),
		);
	}

	/** The skill version each of these published agent versions pins, keyed by agent version. */
	private async findActivePins(
		skillId: string,
		agentVersionIds: string[],
		manager: EntityManager,
	): Promise<Map<string, string>> {
		const pins = await inChunks(
			agentVersionIds,
			async (chunk) =>
				await manager.find(AgentVersionSkillDependency, {
					select: ['agentVersionId', 'skillVersionId'],
					where: { skillId, agentVersionId: In(chunk) },
				}),
		);
		return new Map(pins.map((pin) => [pin.agentVersionId, pin.skillVersionId]));
	}
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

/** Runs `read` over the distinct ids in chunks that stay under the bind limit. */
async function inChunks<T>(ids: string[], read: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
	const results: T[] = [];
	for (const chunk of chunkIds(unique(ids))) results.push(...(await read(chunk)));
	return results;
}
