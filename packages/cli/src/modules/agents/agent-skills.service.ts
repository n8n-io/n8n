import {
	agentSkillSchema,
	type AgentJsonSkillConfig,
	type AgentSkill,
	type AgentSkillMutationResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';

import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';

import {
	type AgentMutationTelemetryContext,
	buildAgentMutationEvent,
	captureAgentMutation,
} from './agent-modification-telemetry.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { Agent } from './entities/agent.entity';
import { composeJsonConfig } from './json-config/agent-config-composition';
import type { AgentSkillRefs } from './json-config/agent-document';
import { AgentRepository } from './repositories/agent.repository';
import { findIntroducedNameClashes } from './skills/skill-names';
import { SkillService } from './skills/skill.service';
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
	): Promise<AgentSkillMutationResponse> {
		const { results } = await this.createSkillsBatch(agentId, projectId, [skill], context);
		return results[0];
	}

	private async createSkillsBatch(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
		context: AgentMutationTelemetryContext,
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

		const bodies = skills.map((skill) => toStoredSkill(this.validateSkill(skill)));
		await this.assertCanCreateSkills(context.user, entity.projectId);

		const previous = await this.agentSkillRefs.readDraft(entity, {});
		this.assertNoNameClashes(previous.skills, bodies);
		const snapshot = captureAgentMutation(entity, previous.skillRefs);

		markAgentDraftDirty(entity);
		const { ids, skillRefs } = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, entity, ctx);
			const created: string[] = [];
			for (const skill of bodies) {
				created.push(
					await this.skillService.create(
						{
							target: { userId: null, projectId: entity.projectId },
							skill,
							source: 'agent',
							createdById: context.user.id,
						},
						ctx,
					),
				);
			}
			const nextRefs: AgentJsonSkillConfig[] = [
				...(previous.skillRefs ?? []),
				...created.map((id) => ({ type: 'skill' as const, id })),
			];
			await this.agentSkillRefs.replaceDraftRefs(entity, nextRefs, ctx);
			return {
				ids: created,
				skillRefs: await this.agentSkillRefs.refsForDraft(entity, ctx),
			};
		});

		await this.saveCompletion.bodySaved(
			buildAgentMutationEvent(entity, skillRefs, projectId, context, snapshot, { skills: true }),
			context.pushRef,
		);

		this.logger.debug('Created and attached agent skills', { agentId, projectId, skillIds: ids });

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
	): Promise<AgentSkillMutationResponse> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);

		const skillRefs = (await this.agentSkillRefs.refsForDraft(entity, {})) ?? [];
		const ref = skillRefs.find((candidate) => candidate.id === skillId);
		if (!ref) throw new NotFoundError('Skill not found');
		const existing = (await this.agentSkillRefs.skillsForRefs([ref], {}))[skillId];
		if (!existing) throw new NotFoundError('Skill not found');
		if (baseSkillHash !== undefined && baseSkillHash !== getAgentSkillHash(existing)) {
			throw new ConflictError('Skill was changed elsewhere; reload to get the latest version');
		}

		const { allowedTools: _ignored, ...changes } = updates;
		const updated: AgentSkill = { ...existing, ...changes };
		if (instructionEdits?.length) {
			if (updates.instructions !== undefined) {
				throw new UserError('Pass either instructions or instructionEdits, not both.');
			}
			updated.instructions = applySkillInstructionEdits(existing.instructions, instructionEdits);
		}
		if ('references' in updates && !updates.references?.length) delete updated.references;
		this.validateSkill(updated);

		if (isEqual(existing, updated)) {
			return {
				id: skillId,
				skill: existing,
				skillHash: getAgentSkillHash(existing),
				versionId: entity.versionId,
			};
		}

		const pinned = ref.versionId !== undefined;
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
		const snapshot = captureAgentMutation(entity, skillRefs);

		const saved = await this.transactionRunner.run({}, async (ctx) => {
			if (pinned) await this.agentSkillRefs.unpinDraftRef(entity, skillId, ctx);
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
				snapshot,
				{ skills: true },
			),
			context.pushRef,
		);

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
		const snapshot = captureAgentMutation(entity, previousSkillRefs);

		markAgentDraftDirty(entity);
		const skillRefs = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, entity, ctx);
			await this.agentSkillRefs.replaceDraftRefs(
				entity,
				previousSkillRefs.filter((ref) => ref.id !== skillId),
				ctx,
			);
			return await this.agentSkillRefs.refsForDraft(entity, ctx);
		});
		await this.saveCompletion.bodySaved(
			buildAgentMutationEvent(entity, skillRefs, projectId, context, snapshot, { skills: true }),
			context.pushRef,
		);

		this.logger.debug('Detached agent skill', { agentId, projectId, skillId });
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

	private async assertCanCreateSkills(user: User, projectId: string): Promise<void> {
		if (!(await userHasScopes(user, ['projectSkill:create'], false, { projectId }))) {
			throw new ForbiddenError('You are not allowed to create skills for this project.');
		}
	}

	/** New names must be easy to tell apart from the agent's skills and from each other. */
	private assertNoNameClashes(existing: Record<string, AgentSkill>, added: AgentSkill[]): void {
		const clashes = findIntroducedNameClashes(
			Object.values(existing).map((skill) => skill.name),
			added.map((skill) => skill.name),
		);
		if (clashes.length > 0) {
			throw new UserError(
				`Agent already has a skill with a name like "${clashes.map((name) => name.trim()).join('", "')}".`,
			);
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
