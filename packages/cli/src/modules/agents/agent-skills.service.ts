import {
	agentSkillSchema,
	type AgentJsonSkillConfig,
	type AgentSkillAvailability,
	type AgentSkill,
	type AgentSkillMutationResponse,
	type SkillCreateMethod,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import { TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';

import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { userHasScopes } from '@/permissions.ee/check-access';
import { findIntroducedNameClashes, findNameClashGroups } from '@/modules/skills/skill-names';
import {
	SkillService,
	withTrimmedName,
	type SkillMoveOptions,
} from '@/modules/skills/skill.service';
import {
	SkillsTelemetry,
	type SkillTelemetryMethod,
	type SkillTelemetrySource,
} from '@/modules/skills/skills-telemetry';

import {
	type AgentMutationTelemetryContext,
	buildAgentMutationEvent,
} from './agent-modification-telemetry.service';
import { AgentDefinitionService } from './agent-definition.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { Agent } from './entities/agent.entity';
import { composeJsonConfig } from './json-config/agent-config-composition';
import type { AgentSkillRefs } from './json-config/agent-document';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentConfigHash, getAgentSkillHash } from './utils/agent-config-hash';
import { markAgentDraftDirty, saveAgentDraftFenced } from './utils/agent-draft.utils';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
import {
	applySkillInstructionEdits,
	type SkillInstructionEdit,
} from './utils/skill-instruction-edits';

/**
 * Skill writes from one agent: the builder, the agent builder tools and MCP.
 * The skills live in the skills hub. Create makes a hub skill in the agent's
 * project and attaches it. Update saves the next version of the hub skill.
 * Delete detaches the skill from the agent and keeps the hub skill.
 */
@Service()
export class AgentSkillsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly saveCompletion: AgentSaveCompletionService,
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly skillService: SkillService,
		private readonly transactionRunner: TransactionRunner,
		private readonly skillsTelemetry: SkillsTelemetry,
		private readonly projectScopeService: ProjectScopeService,
		private readonly definitionService: AgentDefinitionService,
	) {}

	/** The skills of the agent draft, keyed by skill id: the versions that the draft runs. */
	async listSkills(agentId: string, projectId: string): Promise<Record<string, AgentSkill>> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		return (await this.agentSkillRefs.readDraft(entity, {})).skills;
	}

	async getSkill(agentId: string, projectId: string, skillId: string): Promise<AgentSkill> {
		const skills = await this.listSkills(agentId, projectId);
		const skill = Object.hasOwn(skills, skillId) ? skills[skillId] : undefined;
		if (!skill) throw new NotFoundError('Skill not found');

		return skill;
	}

	/**
	 * Create skills in the skills hub and attach them to the agent, in one
	 * transaction. All-or-nothing: every skill is validated, and its name is
	 * checked against the agent's skills and the rest of the batch, before any
	 * write.
	 */
	async createAndAttachSkills(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
		context: AgentMutationTelemetryContext,
	): Promise<{ skills: AgentSkillMutationResponse[]; configHash: string | null }> {
		const { results, saved, skillRefs } = await this.createSkillsBatch(
			agentId,
			projectId,
			skills,
			context,
		);
		return {
			skills: results,
			configHash: getAgentConfigHash(composeJsonConfig(saved, skillRefs)),
		};
	}

	async createAndAttachSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
		context: AgentMutationTelemetryContext,
		availableTo: AgentSkillAvailability = 'project',
		method?: SkillCreateMethod,
	): Promise<AgentSkillMutationResponse> {
		const { results } = await this.createSkillsBatch(
			agentId,
			projectId,
			[skill],
			context,
			availableTo,
			method,
		);
		return results[0];
	}

	private async createSkillsBatch(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
		context: AgentMutationTelemetryContext,
		availableTo: AgentSkillAvailability = 'project',
		method?: SkillCreateMethod,
	): Promise<{ results: AgentSkillMutationResponse[]; saved: Agent; skillRefs: AgentSkillRefs }> {
		if (skills.length === 0) {
			throw new UserError('At least one skill is required.');
		}

		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (!entity.schema) throw new UserError('Agent has no JSON config yet.');

		// Skills ignore `allowedTools`, and get the trimmed name the hub stores, so the
		// answer and its hash match the saved skill.
		const bodies = skills.map((skill) => withTrimmedName(toStoredSkill(this.validateSkill(skill))));
		await this.assertCanCreateSkills(context.user, entity.projectId, availableTo);

		const previous = await this.agentSkillRefs.readDraft(entity, {});
		this.assertNoNameClashes(previous.skills, bodies);

		markAgentDraftDirty(entity);
		const { ids, skillRefs } = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, entity, ctx);
			const created = await this.agentSkillRefs.createSkills(
				entity,
				bodies,
				context.user.id,
				availableTo,
				telemetrySourceOf(context),
				ctx,
			);
			const nextRefs: AgentJsonSkillConfig[] = [
				...(previous.skillRefs ?? []),
				...created.map((id) => ({ type: 'skill' as const, id })),
			];
			await this.agentSkillRefs.replaceDraftRefs(entity, nextRefs, ctx);
			await this.definitionService.captureVersion(entity, context.user, ctx, context.modifiedBy);
			return {
				ids: created,
				skillRefs: await this.agentSkillRefs.refsForDraft(entity, ctx),
			};
		});

		await this.saveCompletion.bodySaved(
			buildAgentMutationEvent(entity, skillRefs, projectId, context, ['skills']),
			context.pushRef,
		);

		this.logger.debug('Created and attached agent skills', { agentId, projectId, skillIds: ids });
		await this.skillsTelemetry.created(
			context.user.id,
			ids,
			telemetrySourceOf(context),
			telemetryMethodOf(context, method),
		);

		return {
			results: ids.map((id, index) => ({
				id,
				skill: bodies[index],
				skillHash: getAgentSkillHash(bodies[index]),
				versionId: entity.versionId,
			})),
			saved: entity,
			skillRefs,
		};
	}

	/**
	 * Save the next version of a skill of this agent. The user needs the edit
	 * permission of the skill itself. Every agent that follows the skill runs
	 * the new version and shows unpublished changes. A ref of this agent that
	 * pins the latest version loses its pin, so this agent runs the new version
	 * too. A ref that pins an older version cannot be edited.
	 */
	async updateSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		updates: Partial<AgentSkill>,
		context: AgentMutationTelemetryContext,
		baseSkillHash?: string,
		instructionEdits?: SkillInstructionEdit[],
		availableTo?: AgentSkillAvailability,
	): Promise<AgentSkillMutationResponse> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);

		const skillRefs = await this.agentSkillRefs.refsForDraft(entity, {});
		const ref = skillRefs.find((candidate) => candidate.id === skillId);
		const existing = ref && (await this.agentSkillRefs.skillsForRefs([ref], {}))[skillId];
		if (!existing) throw new NotFoundError('Skill not found');
		if (baseSkillHash !== undefined && baseSkillHash !== getAgentSkillHash(existing)) {
			throw new ConflictError('Skill was changed elsewhere; reload to get the latest version');
		}

		// Skills ignore `allowedTools`.
		const { allowedTools: _allowedTools, ...changes } = updates;
		const updated: AgentSkill = { ...existing, ...changes };
		if (instructionEdits?.length) {
			if (updates.instructions !== undefined) {
				throw new UserError('Pass either instructions or instructionEdits, not both.');
			}
			updated.instructions = applySkillInstructionEdits(existing.instructions, instructionEdits);
		}
		if ('references' in updates && !updates.references?.length) delete updated.references;
		this.validateSkill(updated);

		const nextAvailability = await this.availabilityChange(skillId, availableTo);
		let moveOptions: SkillMoveOptions = {};
		if (nextAvailability) {
			await this.skillService.assertCanEdit(context.user, [skillId]);
			const checkedSource = await this.skillService.assertCanMove(context.user, skillId);
			await this.assertCanCreateSkills(context.user, entity.projectId, nextAvailability);
			// A refused move names only the agents the user may read.
			const agentProjectIds = await this.projectScopeService.getProjectIds(context.user, [
				'agent:read',
			]);
			moveOptions = { checkedSource, agentProjectIds: agentProjectIds ?? 'all' };
		}

		if (isEqual(existing, updated)) {
			if (nextAvailability) {
				await this.agentSkillRefs.setAvailability(
					entity,
					skillId,
					nextAvailability,
					{},
					moveOptions,
				);
			}
			return {
				id: skillId,
				skill: existing,
				skillHash: getAgentSkillHash(existing),
				versionId: entity.versionId,
			};
		}

		const pinned = ref?.versionId !== undefined;
		if (pinned) {
			const latest = (
				await this.agentSkillRefs.skillsForRefs([{ type: 'skill', id: skillId }], {})
			)[skillId];
			if (!latest || getAgentSkillHash(latest) !== getAgentSkillHash(existing)) {
				throw new UserError(
					'This agent uses an older version of this skill. Use the latest version first, then edit the skill. To use the latest version, remove versionId from the skill ref in the agent config.',
				);
			}
		}
		await this.skillService.assertCanEdit(context.user, [skillId]);

		if (pinned) markAgentDraftDirty(entity);
		const saved = await this.transactionRunner.run({}, async (ctx) => {
			if (nextAvailability) {
				// The move checks the name the skill has after the save, not the old one.
				await this.agentSkillRefs.setAvailability(entity, skillId, nextAvailability, ctx, {
					...moveOptions,
					nameAfterMove: updated.name,
				});
			}
			if (pinned) {
				await saveAgentDraftFenced(this.agentRepository, entity, ctx);
				await this.agentSkillRefs.unpinDraftRef(entity, skillId, ctx);
			}
			return await this.skillService.save(
				skillId,
				{
					name: updated.name,
					description: updated.description,
					instructions: updated.instructions,
					references: updated.references ?? [],
					baseSkillHash: getAgentSkillHash(existing),
				},
				context.user.id,
				ctx,
			);
		});

		await this.skillService.refreshFollowingAgents(
			saved.followingAgentIds.filter((id) => id !== entity.id),
			context.pushRef,
		);
		const fresh = (await this.agentRepository.findByIdAndProjectId(entity.id, projectId)) ?? entity;
		await this.saveCompletion.bodySaved(
			buildAgentMutationEvent(
				fresh,
				await this.agentSkillRefs.refsForDraft(fresh, {}),
				projectId,
				context,
				['skills'],
			),
			context.pushRef,
		);

		if (saved.created) {
			await this.skillsTelemetry.updated(
				context.user.id,
				skillId,
				telemetrySourceOf(context),
				saved.version,
				nextAvailability !== undefined,
			);
		}

		this.logger.debug('Updated agent skill', {
			agentId,
			projectId,
			skillId,
			version: saved.version,
			created: saved.created,
		});

		return {
			id: skillId,
			skill: saved.skill,
			skillHash: getAgentSkillHash(saved.skill),
			versionId: fresh.versionId,
		};
	}

	/** Detach a skill from the agent. The skill stays in the skills hub. */
	async deleteSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		context: AgentMutationTelemetryContext,
	): Promise<void> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);

		const previousSkillRefs = await this.agentSkillRefs.refsForDraft(entity, {});
		if (!previousSkillRefs?.some((ref) => ref.id === skillId)) {
			throw new NotFoundError('Skill not found');
		}
		markAgentDraftDirty(entity);
		const skillRefs = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, entity, ctx);
			await this.agentSkillRefs.replaceDraftRefs(
				entity,
				previousSkillRefs.filter((ref) => ref.id !== skillId),
				ctx,
			);
			await this.definitionService.captureVersion(entity, context.user, ctx, context.modifiedBy);
			return await this.agentSkillRefs.refsForDraft(entity, ctx);
		});
		await this.saveCompletion.bodySaved(
			buildAgentMutationEvent(entity, skillRefs, projectId, context, ['skills']),
			context.pushRef,
		);

		this.logger.debug('Detached agent skill', { agentId, projectId, skillId });
	}

	private async availabilityChange(
		skillId: string,
		availableTo: AgentSkillAvailability | undefined,
	): Promise<AgentSkillAvailability | undefined> {
		if (availableTo === undefined) return undefined;
		const current = await this.agentSkillRefs.availabilityOf(skillId, {});
		return current === availableTo ? undefined : availableTo;
	}

	validateSkills(skills: AgentSkill[], existing: Record<string, AgentSkill> = {}): void {
		const validated = skills.map((skill) => this.validateSkill(skill));
		this.assertNoNameClashes(existing, validated);
	}

	private validateSkill(skill: AgentSkill): AgentSkill {
		const result = agentSkillSchema.safeParse(skill);
		if (!result.success) {
			throw new UserError(
				`Invalid agent skill: ${result.error.issues[0]?.message ?? 'Invalid skill'}`,
			);
		}
		return result.data;
	}

	private async assertCanCreateSkills(
		user: User,
		projectId: string,
		availableTo: AgentSkillAvailability,
	): Promise<void> {
		// A skill of one agent is part of that agent: the agent permission is enough.
		if (availableTo === 'agent') return;
		if (availableTo === 'instance') {
			if (!hasGlobalScope(user, 'skill:create')) {
				throw new ForbiddenError('You are not allowed to create skills for the whole instance.');
			}
			return;
		}
		if (!(await userHasScopes(user, ['projectSkill:create'], false, { projectId }))) {
			throw new ForbiddenError('You are not allowed to create skills for this project.');
		}
	}

	/** New names must be easy to tell apart from the agent's skills and from each other. */
	private assertNoNameClashes(existing: Record<string, AgentSkill>, added: AgentSkill[]): void {
		const quote = (names: string[]) => names.map((name) => name.trim()).join('", "');
		const existingNames = Object.values(existing).map((skill) => skill.name);
		const clashes = added
			.map((skill) => skill.name)
			.filter((name) => findIntroducedNameClashes(existingNames, [name]).length > 0);
		if (clashes.length > 0) {
			throw new UserError(`Agent already has a skill with a name like "${quote(clashes)}".`);
		}
		// Two new skills of one batch can also clash with each other.
		const inBatch = findNameClashGroups(added.map((skill) => skill.name));
		if (inBatch.length > 0) {
			throw new UserError(`The new skills "${quote(inBatch[0])}" are hard to tell apart.`);
		}
	}
}

/** The fields a skill version stores. Skills ignore `allowedTools`. */
function toStoredSkill(skill: AgentSkill): AgentSkill {
	return {
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		...(skill.references?.length ? { references: skill.references } : {}),
	};
}

/** A person in the agent builder and n8n Assistant building the agent both report as `agent`. */
function telemetrySourceOf(context: AgentMutationTelemetryContext): SkillTelemetrySource {
	return context.modifiedBy === 'mcp' ? 'mcp' : 'agent';
}

/** Only a person in the skill modal types or uploads. n8n Assistant and MCP clients write with AI. */
function telemetryMethodOf(
	context: AgentMutationTelemetryContext,
	method: SkillCreateMethod | undefined,
): SkillTelemetryMethod {
	return context.modifiedBy === 'user' ? (method ?? 'manual') : 'ai';
}
