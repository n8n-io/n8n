import {
	hasSkillInstructions,
	SKILL_INSTRUCTIONS_REQUIRED_MESSAGE,
	skillNameKey,
	type AgentSkill,
	type CreateSkillDto,
	type ListSkillAgentsQueryDto,
	type ListSkillsQueryDto,
	type SaveSkillDto,
	type SkillAgentOption,
	type SkillDetail,
	type SkillListItem,
	type SkillListResponse,
	type SkillNewNameQueryDto,
	type SkillNewNameResponse,
	type SkillSaveResponse,
	type SkillSortOption,
	type SkillUserDto,
	type SkillVersionDetail,
	type SkillVersionListItem,
	type SkillVersionSummary,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import { TransactionRunner, UserRepository, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError, UserError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import type { SkillFrontmatter, SkillVersion } from '../database/entities/skill-version.entity';
import type { Skill, SkillSource } from '../database/entities/skill.entity';
import { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import {
	SkillRepository,
	type SkillListSort,
	type SkillVisibility,
} from '../database/repositories/skill.repository';
import { SkillNameTakenError } from '../errors/skill-name-taken.error';
import { SkillSyncedError } from '../errors/skill-synced.error';
import {
	isSameSkillTarget,
	skillScopeOf,
	syncedSourceLabel,
	toAgentSkill,
	toLatestSkill,
	toSkillContent,
	trimmedName,
	withTrimmedName,
	type LatestSkill,
	type McpSkillContent,
	type ResolvedSkillRow,
	type SkillMoveOptions,
	type SkillSaveResult,
	type SkillTarget,
	type SkillUpdate,
} from '../utils/skill-content';
import { skillContentHash } from '../utils/skill-content-hash';
import { getSkillHash } from '../utils/skill-hash';
import { AssistantSkillsFlagGate } from './assistant-skills-flag-gate';
import { SkillAccessService } from './skill-access.service';
import { SkillRuntimeService } from './skill-runtime.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillSyncedFromService } from './skill-synced-from.service';
import {
	blocksDelete,
	deleteRefusalMessage,
	findLosingAgents,
	isNameTaken,
	losingAgentsMessage,
	nextFreeName,
	type VisibleProjects,
} from './skill.policy';
import { SkillUsageProxy } from './skill-usage-proxy.service';
import {
	SkillsTelemetry,
	type SkillTelemetryMethod,
	type SkillTelemetryRef,
	type SkillTelemetrySource,
} from './skills-telemetry.service';

const LIST_SORTS: Record<SkillSortOption, SkillListSort> = {
	'name:asc': { by: 'name', order: 'ASC' },
	'name:desc': { by: 'name', order: 'DESC' },
	'updatedAt:asc': { by: 'updatedAt', order: 'ASC' },
	'updatedAt:desc': { by: 'updatedAt', order: 'DESC' },
};

function toMcpSkillContent(row: ResolvedSkillRow): McpSkillContent {
	return { id: row.skill.id, projectId: row.skill.projectId, skill: toAgentSkill(row) };
}

function assertUnchangedSince(
	latest: ResolvedSkillRow,
	baseVersionId: string | undefined,
	checkedTarget: SkillTarget | undefined,
): void {
	if (checkedTarget && !isSameSkillTarget(latest.skill, checkedTarget)) {
		throw new ConflictError('The skill scope changed. Reload the skill and try again.');
	}
	if (baseVersionId !== undefined && baseVersionId !== latest.version.id) {
		throw new ConflictError(
			'The skill was changed somewhere else. Reload to get the latest version.',
		);
	}
}

function assertHasInstructions(skill: AgentSkill): void {
	if (!hasSkillInstructions(skill.instructions)) {
		throw new UserError(SKILL_INSTRUCTIONS_REQUIRED_MESSAGE);
	}
}

function toVersionSummary(
	version: Pick<SkillVersion, 'id' | 'version' | 'createdById' | 'createdAt'>,
	users: Map<string, SkillUserDto>,
): SkillVersionSummary {
	return {
		id: version.id,
		version: version.version,
		createdBy: version.createdById ? (users.get(version.createdById) ?? null) : null,
		createdAt: version.createdAt.toISOString(),
	};
}

/**
 * User actions on skills and the rules of every write: list, read, create, save, move and
 * delete. REST, MCP tools, n8n Assistant tools and the agent builder call the same
 * methods. A user action takes the `User` and checks access through `SkillAccessService`.
 * A `*Trusted` write is for a caller that checked access itself and composes the write
 * into its own transaction. What depends on agents comes from `SkillUsageProxy`.
 */
@Service()
export class SkillService {
	constructor(
		private readonly logger: Logger,
		private readonly skillRepository: SkillRepository,
		private readonly txRunner: TransactionRunner,
		private readonly projectScopeService: ProjectScopeService,
		private readonly userRepository: UserRepository,
		private readonly skillUsage: SkillUsageProxy,
		private readonly skillAccess: SkillAccessService,
		private readonly skillRuntime: SkillRuntimeService,
		private readonly skillsTelemetry: SkillsTelemetry,
		private readonly assistantSkillsFlagGate: AssistantSkillsFlagGate,
		private readonly syncedFrom: SkillSyncedFromService,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly skillSyncFlagGate: SkillSyncFlagGate,
	) {}

	// ---------------------------------------------------------------- user actions

	async list(user: User, query: ListSkillsQueryDto): Promise<SkillListResponse> {
		if (query.attachableTo !== undefined && (query.scope || query.projectId || query.agentId)) {
			throw new UserError('Filter by attachableTo alone, without scope, projectId or agentId.');
		}
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		// A project the user may not list answers like a project without skills.
		if (query.projectId && projectIds !== null && !projectIds.includes(query.projectId)) {
			return { count: 0, data: [] };
		}
		const [usedBySkillIds, attachableToProjectId] = await Promise.all([
			this.usedByFilter(user, query.agentId),
			this.attachTarget(query.attachableTo),
		]);
		if (usedBySkillIds === null) return { count: 0, data: [] };
		const { skills, count } = await this.skillRepository.findVisiblePage(visibilityOf(projectIds), {
			scope: query.scope,
			projectId: query.projectId || undefined,
			attachableToProjectId,
			usedBySkillIds,
			createdById: query.createdById,
			search: query.search,
			sort: query.sortBy && LIST_SORTS[query.sortBy],
			skip: query.skip,
			take: query.take,
		});
		return { count, data: await this.toListItems(user, skills) };
	}

	/** The users who created a skill that the user may see, for the creator filter. */
	async listCreators(user: User): Promise<SkillUserDto[]> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		const creatorIds = await this.skillRepository.findVisibleCreatorIds(visibilityOf(projectIds));
		return [...(await this.findCreators(creatorIds)).values()];
	}

	/** The agents the user may read, for the agent filter. Global readers see every agent. */
	async listAgents(user: User, query: ListSkillAgentsQueryDto): Promise<SkillAgentOption[]> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		return await this.skillUsage.findAgentSummaries(projectIds, {
			search: query.search,
			limit: query.take,
		});
	}

	/** One page of the latest saved versions the user may list, for the MCP skills extension. */
	async listForMcp(
		user: User,
		skip: number,
		take: number,
	): Promise<{ count: number; skills: McpSkillContent[] }> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		const page = await this.skillRepository.findVisiblePage(visibilityOf(projectIds), {
			skip,
			take,
			availableToMCP: true,
		});
		const rows = await this.skillRepository.findLatestSaved(page.skills.map((skill) => skill.id));
		return {
			count: page.count,
			skills: page.skills.flatMap((skill) => {
				const row = rows.get(skill.id);
				return row ? [toMcpSkillContent(row)] : [];
			}),
		};
	}

	/** The latest saved version of a project or instance skill, for the MCP skills extension. */
	async readForMcp(user: User, skillId: string): Promise<McpSkillContent | null> {
		const row = (await this.skillRepository.findLatestSaved([skillId])).get(skillId);
		if (
			!row ||
			!row.skill.availableToMCP ||
			!(await this.skillAccess.canAccess(user, row.skill, 'read'))
		) {
			return null;
		}
		const content = toMcpSkillContent(row);
		// The origin is only for telemetry: a failed lookup must not break the read.
		const synced = await this.sourceRepository.findSyncedFrom(skillId).catch((error: unknown) => {
			this.logger.warn('Could not find the source of a synced skill', {
				skillId,
				error: ensureError(error).message,
			});
			return null;
		});
		if (!synced) return content;
		return {
			...content,
			origin: { provider: synced.type, access: synced.credentialId ? 'credential' : 'public' },
		};
	}

	async get(user: User, skillId: string): Promise<SkillDetail> {
		return await this.toDetail(user, await this.skillAccess.requireAccess(user, skillId, 'read'));
	}

	/** A free name for a new skill. Needs the create permission there, so it shows no other scope. */
	async newName(user: User, query: SkillNewNameQueryDto): Promise<SkillNewNameResponse> {
		const target = await this.skillAccess.resolveCreateTarget(user, query);
		return { name: await this.freeName(query.name, target) };
	}

	async create(
		user: User,
		payload: CreateSkillDto,
		source: SkillTelemetrySource = 'ui',
	): Promise<SkillDetail> {
		if (
			payload.availableToAssistant !== undefined &&
			!(await this.assistantSkillsFlagGate.isEnabled())
		) {
			throw new UserError("The n8n Assistant can't use skills on this instance.");
		}
		const target = await this.skillAccess.resolveCreateTarget(user, payload);
		const input = {
			checkNameTaken: true,
			target,
			skill: payload.skill,
			source,
			createdById: user.id,
		};
		const id =
			payload.availableToAssistant || payload.availableToMCP
				? await this.txRunner.run({}, async (ctx) => {
						const createdId = await this.createTrusted(input, ctx);
						if (payload.availableToAssistant) {
							await this.setAssistantAvailability(createdId, true, target, ctx);
						}
						if (payload.availableToMCP) {
							await this.setMcpAvailability(createdId, true, target, ctx);
						}
						return createdId;
					})
				: await this.createTrusted(input);
		await this.skillsTelemetry.created(
			user.id,
			[{ id, ...target }],
			source,
			source === 'ui' ? (payload.method ?? 'manual') : 'ai',
		);
		// No second access check: a custom role can create skills it cannot read later.
		const [skill] = await this.skillRepository.findByIds([id]);
		if (!skill) throw new NotFoundError('Skill not found');
		return await this.toDetail(user, skill);
	}

	/** Saves the changes as the next version. Unchanged content creates nothing. */
	async update(
		user: User,
		skillId: string,
		payload: SaveSkillDto,
		source: SkillTelemetrySource = 'ui',
	): Promise<SkillSaveResponse> {
		if (
			payload.availableToAssistant !== undefined &&
			!(await this.assistantSkillsFlagGate.isEnabled())
		) {
			throw new NotFoundError('Skill not found');
		}
		const skill = await this.skillAccess.requireAccess(user, skillId, 'update');
		const { scope, projectId, availableToAssistant, availableToMCP, ...update } = payload;
		const target = scope
			? await this.skillAccess.resolveCreateTarget(user, { scope, projectId })
			: undefined;
		const moves = target !== undefined && target.projectId !== skill.projectId;

		const checkedSource = moves ? await this.skillAccess.assertCanMove(user, skillId) : undefined;

		if (!moves && availableToAssistant === undefined && availableToMCP === undefined) {
			const { followingAgentIds: _following, ...saved } = await this.saveTrusted(
				skillId,
				update,
				user.id,
			);
			if (saved.created) {
				// No move, so the skill stays where `requireAccess` read it.
				await this.skillsTelemetry.updated(user.id, skill, source, saved.version, false);
			}
			return { id: skillId, ...saved, skillHash: getSkillHash(saved.skill) };
		}

		// A refused move names only the agents the user may read, as the detail does.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		// Keep availability, scope, and content changes atomic. Move first so the name
		// check uses the destination scope.
		const { followingAgentIds, ...saved } = await this.txRunner.run({}, async (ctx) => {
			if (moves) {
				await this.moveTrusted(skillId, target, undefined, ctx, {
					nameAfterMove: update.name,
					checkedSource,
					agentProjectIds: agentProjectIds ?? 'all',
				});
			}
			if (availableToAssistant !== undefined) {
				await this.setAssistantAvailability(skillId, availableToAssistant, target ?? skill, ctx);
			}
			if (availableToMCP !== undefined) {
				await this.setMcpAvailability(skillId, availableToMCP, target ?? skill, ctx);
			}
			return await this.saveTrusted(skillId, update, user.id, ctx);
		});
		// `saveTrusted` leaves the refresh to the caller when it joins a transaction.
		await this.refreshFollowingAgents(followingAgentIds);
		if (saved.created) {
			await this.skillsTelemetry.updated(
				user.id,
				target ? { id: skillId, ...target } : skill,
				source,
				saved.version,
				moves,
			);
		}
		return { id: skillId, ...saved, skillHash: getSkillHash(saved.skill) };
	}

	/** Every saved version of the skill, newest first, so the first one is the latest. Needs read access. */
	async listVersions(user: User, skillId: string): Promise<SkillVersionListItem[]> {
		await this.skillAccess.requireAccess(user, skillId, 'read');
		const versions = await this.skillRepository.findVersionList(skillId);
		const users = await this.findCreators(versions.flatMap((version) => version.createdById ?? []));
		return versions.map((version, index) => ({
			...toVersionSummary(version, users),
			isLatest: index === 0,
		}));
	}

	/** One saved version with its content. Needs read access. */
	async getVersion(user: User, skillId: string, version: number): Promise<SkillVersionDetail> {
		await this.skillAccess.requireAccess(user, skillId, 'read');
		const row = await this.skillRepository.findVersionByNumber(skillId, version);
		if (!row) throw new NotFoundError('Skill version not found');
		const users = await this.findCreators(row.version.createdById ? [row.version.createdById] : []);
		return { ...toVersionSummary(row.version, users), skill: toAgentSkill(row) };
	}

	/**
	 * The latest saved version of each skill, keyed by skill id. Unknown ids are absent.
	 * Checks no access: the caller checks it.
	 */
	async findLatest(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, LatestSkill>> {
		const rows = await this.skillRepository.findLatestSaved(skillIds, ctx);
		return new Map([...rows].map(([id, row]) => [id, toLatestSkill(row)]));
	}

	async delete(user: User, skillId: string, source: SkillTelemetrySource = 'ui'): Promise<void> {
		const skill = await this.skillAccess.requireAccess(user, skillId, 'delete');
		// The conflict message names only the agents the user may read, as the detail does.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		await this.deleteSkill(skillId, agentProjectIds ?? 'all');
		await this.skillsTelemetry.deleted(user.id, skill, source);
	}

	// ---------------------------------------------------------------- trusted writes

	/**
	 * Creates a skill with its v1. Returns the new id. `checkNameTaken` is for a name that a
	 * user or the builder chose. A caller that took a name from `freeNames` skips the check.
	 * `frontmatter` holds the SKILL.md keys other than name and description, stored as given.
	 */
	async createTrusted(
		input: {
			id?: string;
			target: SkillTarget;
			skill: AgentSkill;
			source: SkillSource;
			createdById: string;
			checkNameTaken?: boolean;
			frontmatter?: SkillFrontmatter | null;
			/** For a synced skill: the source revision of the content, such as a commit SHA. */
			sourceRevision?: string | null;
		},
		ctx: OperationContext = {},
	): Promise<string> {
		const skill = withTrimmedName(input.skill);
		assertHasInstructions(skill);
		if (input.checkNameTaken) {
			await this.assertNameFree(skill.name, input.target, undefined, ctx);
		}
		const id = input.id ?? `skill_${generateNanoId()}`;
		await this.skillRepository.createSkill(
			{
				id,
				target: input.target,
				source: input.source,
				createdById: input.createdById,
				...(input.sourceRevision ? { sourceRevision: input.sourceRevision } : {}),
			},
			toSkillContent(skill, input.frontmatter ?? null),
			ctx,
		);
		this.logger.debug('Created skill', { skillId: id });
		return id;
	}

	/**
	 * Save: merges the update onto the latest version and stores the result as the next
	 * version, unless the content did not change. Every agent that follows the skill then
	 * runs the new version, and each one that was in sync with its published version
	 * shows unpublished changes. `baseSkillHash` is checked under the edit lock, so two
	 * saves from the same base cannot both pass.
	 *
	 * When `ctx` has a transaction, the caller calls `refreshFollowingAgents` after its
	 * commit. `pushRef` is the tab that saved: it gets no reload push.
	 *
	 * The content of a synced skill changes only with `allowSynced`. Only Skill Sync passes
	 * it, with content that it fetched from the source and the user accepted.
	 */
	async saveTrusted(
		skillId: string,
		update: SkillUpdate,
		userId: string,
		ctx: OperationContext = {},
		{ pushRef, allowSynced = false }: { pushRef?: string; allowSynced?: boolean } = {},
	): Promise<SkillSaveResult> {
		const { saved, following } = await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const latest = (await this.skillRepository.findLatestSaved([skillId], txCtx)).get(skillId);
			if (!latest) throw new NotFoundError('Skill not found');
			const current = toAgentSkill(latest);
			const {
				baseSkillHash,
				frontmatter,
				baseVersionId,
				checkedTarget,
				allowedTools: _ignored,
				...changes
			} = update;
			assertUnchangedSince(latest, baseVersionId, checkedTarget);
			// Only a new name is trimmed, so a save never renames a skill it did not rename.
			if (changes.name !== undefined) changes.name = trimmedName(changes.name);
			if (baseSkillHash !== getSkillHash(current)) {
				throw new ConflictError(
					'The skill was changed somewhere else. Reload to get the latest version.',
				);
			}
			const skill: AgentSkill = { ...current, ...changes };
			if (!skill.references?.length) delete skill.references;
			assertHasInstructions(skill);
			const content = toSkillContent(
				skill,
				frontmatter === undefined ? latest.version.frontmatter : frontmatter,
			);
			if (skillContentHash(content) === latest.version.contentHash) {
				const unchanged = { versionId: latest.version.id, version: latest.version.version };
				const result = { ...unchanged, created: false, skill: current, followingAgentIds: [] };
				return { saved: result, following: [] };
			}
			// Only Skill Sync changes the content of a synced skill: a skill with a link. A save
			// with unchanged content passes above, so a synced skill still accepts a no-op save.
			if (!allowSynced && (await this.sourceRepository.isLinked(skillId, txCtx))) {
				throw new SkillSyncedError(latest.version.name, sourceLabelOf(latest.skill.source));
			}
			await this.assertCanRename(skillId, latest.skill, latest.version.name, skill.name, txCtx);
			const version = await this.skillRepository.nextVersionNumber(skillId, txCtx);
			const versionId = await this.skillRepository.insertSavedVersion(
				skillId,
				version,
				content,
				userId,
				txCtx,
			);
			const followingIds = await this.skillUsage.markFollowersChanged(skillId, txCtx, userId);
			const result = { versionId, version, created: true, skill, followingAgentIds: followingIds };
			return { saved: result, following: followingIds };
		});
		if (!ctx.trx) await this.refreshFollowingAgents(following, pushRef);
		this.logger.debug('Saved skill', {
			skillId,
			version: saved.version,
			created: saved.created,
			following,
		});
		return saved;
	}

	/**
	 * Moves a skill to a project, one agent or the instance. Refused when an agent that uses
	 * the skill cannot add it in the new scope, so a move never takes a skill away from an
	 * agent. `keepAgentId` is the agent that asks for the move: it does not block it. The edit
	 * lock makes a concurrent attach wait, so the check and the move see the same agents.
	 */
	async moveTrusted(
		skillId: string,
		target: SkillTarget,
		keepAgentId: string | undefined,
		ctx: OperationContext = {},
		{ nameAfterMove, checkedSource, agentProjectIds = 'all' }: SkillMoveOptions = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			// `assertCanMove` ran before the lock. If another move changed the scope since,
			// the permission was checked on the wrong scope.
			if (checkedSource) {
				const [locked] = await this.skillRepository.findByIds([skillId], txCtx);
				if (!locked) throw new NotFoundError('Skill not found');
				if (locked.projectId !== checkedSource.projectId) {
					throw new ConflictError(
						'The skill was moved somewhere else. Reload to see where it is now.',
					);
				}
			}
			const name =
				nameAfterMove ??
				(await this.skillRepository.findLatestSummaries([skillId], txCtx)).get(skillId)?.name;
			// All skills of a source share its scope, so a synced skill moves only with its source.
			if (await this.sourceRepository.isLinked(skillId, txCtx)) {
				const [skill] = await this.skillRepository.findByIds([skillId], txCtx);
				throw new SkillSyncedError(
					name ?? skillId,
					sourceLabelOf(skill?.source ?? 'github'),
					'move',
				);
			}
			const others = (await this.skillUsage.findUsingAgentIds(skillId, txCtx)).filter(
				(id) => id !== keepAgentId,
			);
			await this.assertAgentsKeepAccess(others, target, agentProjectIds, txCtx);
			// The new scope must not already hold a name like the one the skill has after the move.
			if (name) await this.assertNameFree(name, target, skillId, txCtx);
			await this.skillRepository.updateTarget(skillId, target, txCtx);
		});
	}

	async setAssistantAvailability(
		skillId: string,
		available: boolean,
		checkedTarget: SkillTarget,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			await this.lockInCheckedTarget(skillId, checkedTarget, txCtx);
			await this.skillRepository.setAssistantAvailability(skillId, available, txCtx);
		});
	}

	async setMcpAvailability(
		skillId: string,
		available: boolean,
		checkedTarget: SkillTarget,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			await this.lockInCheckedTarget(skillId, checkedTarget, txCtx);
			await this.skillRepository.updateAvailableToMCP(skillId, available, txCtx);
		});
	}

	private async lockInCheckedTarget(
		skillId: string,
		checkedTarget: SkillTarget,
		ctx: OperationContext,
	): Promise<Skill> {
		await this.skillRepository.lockForEdit([skillId], ctx);
		const [skill] = await this.skillRepository.findByIds([skillId], ctx);
		if (!skill) throw new NotFoundError('Skill not found');
		if (skill.projectId !== checkedTarget.projectId) {
			throw new ConflictError('The skill scope changed. Reload the skill and try again.');
		}
		return skill;
	}

	/**
	 * After a save commits: following agents drop their cached runtime and their editors
	 * reload, except the tab of `excludePushRef`.
	 */
	async refreshFollowingAgents(agentIds: string[], excludePushRef?: string): Promise<void> {
		await this.skillUsage.refreshAgents(agentIds, excludePushRef);
	}

	async trackCreated(
		userId: string,
		refs: SkillTelemetryRef[],
		source: SkillTelemetrySource,
		method: SkillTelemetryMethod,
	): Promise<void> {
		await this.skillsTelemetry.created(userId, refs, source, method);
	}

	async trackUpdated(
		userId: string,
		ref: SkillTelemetryRef,
		source: SkillTelemetrySource,
		version: number,
		scopeChanged: boolean,
	): Promise<void> {
		await this.skillsTelemetry.updated(userId, ref, source, version, scopeChanged);
	}

	// ---------------------------------------------------------------- rules

	/** A free name in the scope of `target`. The rule is `nextFreeName`. */
	private async freeName(requested: string, target: SkillTarget, ctx: OperationContext = {}) {
		const [name] = await this.freeNames([requested], target, ctx);
		return name;
	}

	/**
	 * `freeName` for many names, in one query. Each name counts as taken for the next ones,
	 * and so does each name in `alsoTaken`.
	 */
	async freeNames(
		requested: string[],
		target: SkillTarget,
		ctx: OperationContext = {},
		alsoTaken: string[] = [],
	): Promise<string[]> {
		if (requested.length === 0) return [];
		const inTarget = await this.skillRepository.findLatestNamesInTarget(
			{ projectId: target.projectId },
			ctx,
		);
		const taken = new Set([...inTarget.map(({ name }) => name), ...alsoTaken].map(skillNameKey));
		return requested.map((name) => {
			const free = nextFreeName(name, taken);
			taken.add(skillNameKey(free));
			return free;
		});
	}

	/**
	 * Refuses a name that is hard to tell apart from another skill's name in the same
	 * scope: one project or the instance, by the same rule as inside one agent.
	 */
	private async assertNameFree(
		name: string,
		target: SkillTarget,
		exceptSkillId: string | undefined,
		ctx: OperationContext,
	): Promise<void> {
		if (await this.isNameTaken(name, target, exceptSkillId, ctx)) {
			throw new SkillNameTakenError(name);
		}
	}

	/**
	 * The rename checks of `saveTrusted`: no other skill in the scope, and no other skill of
	 * an agent that follows this skill, may have a name like the new one. A caller that plans
	 * a save runs them before it writes anything.
	 */
	async assertCanRename(
		skillId: string,
		target: SkillTarget,
		oldName: string,
		newName: string,
		ctx: OperationContext = {},
	): Promise<void> {
		// A rename that only changes case or separators keeps the name key, so it can
		// clash with nothing new. The legacy rule skipped it too.
		if (skillNameKey(newName) === skillNameKey(oldName)) return;
		await this.assertNameFree(newName, target, skillId, ctx);
		await this.skillUsage.assertRenameKeepsNamesApart(skillId, oldName, newName, ctx);
	}

	/**
	 * Whether another skill in the scope has a name that is hard to tell apart from `name`.
	 * The rule is `isNameTaken`.
	 */
	async isNameTaken(
		name: string,
		target: SkillTarget,
		exceptSkillId: string | undefined,
		ctx: OperationContext = {},
	): Promise<boolean> {
		// Callers may pass a whole skill, so only its target goes to the query.
		const names = await this.skillRepository.findLatestNamesInTarget(
			{ projectId: target.projectId },
			ctx,
		);
		return isNameTaken(name, names, exceptSkillId);
	}

	/** Refuses a move that takes the skill away from one of `agentIds`. The rule is `findLosingAgents`. */
	private async assertAgentsKeepAccess(
		agentIds: string[],
		target: SkillTarget,
		agentProjectIds: VisibleProjects,
		ctx: OperationContext,
	): Promise<void> {
		if (agentIds.length === 0 || target.projectId === null) return;
		const agents = await this.skillUsage.findAgents(agentIds, ctx);
		const losing = findLosingAgents(agentIds, target, agents);
		if (losing.length > 0) {
			throw new ConflictError(losingAgentsMessage(losing, agents, agentProjectIds));
		}
	}

	/**
	 * Deletes a skill that no agent draft and no published agent version uses. The conflict
	 * names the agents in `agentProjectIds` and only counts the others.
	 */
	private async deleteSkill(
		skillId: string,
		agentProjectIds: VisibleProjects,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			const [skill] = await this.skillRepository.findByIds([skillId], txCtx);
			if (!skill) throw new NotFoundError('Skill not found');
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const usage = await this.skillUsage.findUsage(skillId, agentProjectIds, txCtx);
			if (blocksDelete(usage)) {
				const name =
					(await this.skillRuntime.latestNames([skillId], txCtx)).get(skillId) ?? skillId;
				throw new ConflictError(deleteRefusalMessage(name, usage));
			}
			await this.skillRepository.deleteSkill(skillId, txCtx);
		});
		this.logger.debug('Deleted skill', { skillId });
	}

	// ---------------------------------------------------------------- read models

	private async toDetail(user: User, skill: Skill): Promise<SkillDetail> {
		const [item] = await this.toListItems(user, [skill]);
		const latest = (await this.skillRepository.findLatestSaved([skill.id])).get(skill.id);
		if (!item || !latest) throw new NotFoundError('Skill not found');
		const content = toAgentSkill(latest);
		// Any user can read an instance skill, so "used by" only names the agents they can read.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		const [usedBy, syncedFrom] = await Promise.all([
			this.skillUsage.findUsage(skill.id, agentProjectIds ?? 'all'),
			this.syncedFrom.of(user, skill.id),
		]);
		return {
			...item,
			// Name, description and number from the same row as the content, so a save that
			// lands between the two reads cannot mix two versions.
			name: latest.version.name,
			description: latest.version.description,
			latestVersion: latest.version.version,
			skill: content,
			skillHash: getSkillHash(content),
			usedBy,
			syncedFrom,
		};
	}

	/**
	 * The agent filter: the skills the agent uses. Null when the agent does not exist or the
	 * user may not read it, so the list is empty and shows nothing about that agent.
	 */
	private async usedByFilter(
		user: User,
		agentId: string | undefined,
	): Promise<string[] | undefined | null> {
		if (agentId === undefined) return undefined;
		const [agents, readable] = await Promise.all([
			this.skillUsage.findAgents([agentId]),
			this.projectScopeService.getProjectIds(user, ['agent:read']),
		]);
		const agent = agents.get(agentId);
		if (!agent) return null;
		if (readable !== null && !readable.includes(agent.projectId)) return null;
		return await this.skillUsage.findSkillIdsUsedByAgent(agentId);
	}

	/** The project of an `attachableTo` agent. An unknown agent can attach nothing. */
	private async attachTarget(agentId: string | undefined): Promise<string | undefined> {
		if (agentId === undefined) return undefined;
		const agent = (await this.skillUsage.findAgents([agentId])).get(agentId);
		if (!agent) throw new NotFoundError('Agent not found');
		return agent.projectId;
	}

	private async toListItems(user: User, skills: Skill[]): Promise<SkillListItem[]> {
		const ids = skills.map((skill) => skill.id);
		const [latest, usage, projects, creators, canEdit, canDelete, synced, skillSyncOn] =
			await Promise.all([
				this.skillRepository.findLatestSummaries(ids),
				this.skillUsage.countUsingAgents(ids),
				this.skillRepository.findProjects(skills.flatMap((skill) => skill.projectId ?? [])),
				this.findCreators(skills.flatMap((skill) => skill.createdById ?? [])),
				this.skillAccess.accessCheck(user, 'update'),
				this.skillAccess.accessCheck(user, 'delete'),
				this.sourceRepository.findSyncStates(ids),
				this.skillSyncFlagGate.isEnabled(user),
			]);
		const items: SkillListItem[] = [];
		for (const skill of skills) {
			const summary = latest.get(skill.id);
			if (!summary) continue;
			const { projectId } = skill;
			items.push({
				id: skill.id,
				name: summary.name,
				description: summary.description,
				scope: skillScopeOf(skill),
				projectId,
				projectName: projectId ? (projects.get(projectId)?.name ?? null) : null,
				projectType: projectId ? (projects.get(projectId)?.type ?? null) : null,
				source: skill.source,
				createdBy: skill.createdById ? (creators.get(skill.createdById) ?? null) : null,
				latestVersion: summary.version,
				usedByAgents: usage.get(skill.id) ?? 0,
				availableToAssistant: skill.availableToAssistant,
				availableToMCP: skill.availableToMCP,
				// The source holds the content of a synced skill, so n8n cannot edit it.
				canEdit: canEdit(skill) && !synced.has(skill.id),
				canDelete: canDelete(skill),
				// Stop syncing needs the update permission of the scope that the skill shares with its source.
				// The route answers 404 while the Skill Sync flag is off for the user.
				canStopSyncing: skillSyncOn && synced.has(skill.id) && canEdit(skill),
				syncState: synced.get(skill.id) ?? null,
				// Check now needs the same permission as stop syncing.
				canCheckForUpdates: skillSyncOn && synced.has(skill.id) && canEdit(skill),
				createdAt: skill.createdAt.toISOString(),
				updatedAt: skill.updatedAt.toISOString(),
			});
		}
		return items;
	}

	/** The users with these ids, in one query. */
	private async findCreators(userIds: string[]): Promise<Map<string, SkillUserDto>> {
		const ids = [...new Set(userIds)];
		if (ids.length === 0) return new Map();
		const users = await this.userRepository.findManyByIds(ids);
		return new Map(
			users.map((creator) => [
				creator.id,
				{
					id: creator.id,
					email: creator.email ?? null,
					firstName: creator.firstName ?? null,
					lastName: creator.lastName ?? null,
				},
			]),
		);
	}
}

/** How a message names the source of a synced skill, such as GitHub. */
function sourceLabelOf(source: SkillSource): string {
	return syncedSourceLabel(source) ?? 'its source';
}

/**
 * The skills a user may list, from the projects where they hold `projectSkill:list`
 * (null for all).
 */
function visibilityOf(projectIds: string[] | null): SkillVisibility {
	return { projectIds: projectIds ?? 'all' };
}
