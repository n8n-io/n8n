import {
	agentSkillSchema,
	type AgentJsonConfig,
	type AgentSkill,
	type AgentSkillMutationResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';

import { ConflictError, NotFoundError } from '@n8n/errors';

import {
	AgentModificationTelemetryService,
	type AgentMutationTelemetryContext,
	buildAgentMutationEvent,
	captureAgentMutation,
	type AgentMutationSnapshot,
} from './agent-modification-telemetry.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { markAgentDraftDirty, saveAgentDraftFenced } from './utils/agent-draft.utils';
import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import { SkillHubRepository } from './repositories/skill-hub.repository';
import {
	findIntroducedNameClashes,
	SkillHubService,
	skillNameKey,
} from './skills-hub/skill-hub.service';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
import { getAgentSkillHash } from './utils/agent-config-hash';

/**
 * Agent-scoped skill operations. Bodies live in the skills hub; the agent keeps
 * `{ type: 'skill', id }` refs. Editing a skill changes every agent that uses it.
 */
@Service()
export class AgentSkillsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
		private readonly skillHub: SkillHubService,
		private readonly skillHubRepository: SkillHubRepository,
	) {}

	/**
	 * The editor's view: the draft row of every skill the agent's draft references,
	 * keyed by ref id. The agent itself runs saved versions (see `SkillHubService`).
	 */
	async listSkills(agentId: string, projectId: string): Promise<Record<string, AgentSkill>> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		return await this.skillHub.resolveEditableSkills(entity.schema);
	}

	async getSkill(agentId: string, projectId: string, skillId: string): Promise<AgentSkill> {
		const skills = await this.listSkills(agentId, projectId);
		const skill = skills[skillId];
		if (!skill) throw new NotFoundError('Skill not found');

		return skill;
	}

	async createSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
		context: AgentMutationTelemetryContext,
	): Promise<AgentSkillMutationResponse> {
		const [result] = await this.createSkillsBatch(agentId, projectId, [skill], false, context);
		return result;
	}

	async createSkills(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
		context: AgentMutationTelemetryContext,
	): Promise<AgentSkillMutationResponse[]> {
		return await this.createSkillsBatch(agentId, projectId, skills, false, context);
	}

	async createAndAttachSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
		context: AgentMutationTelemetryContext,
	): Promise<AgentSkillMutationResponse> {
		const [result] = await this.createSkillsBatch(agentId, projectId, [skill], true, context);
		return result;
	}

	/**
	 * Creates hub skills in the agent's scope, all or nothing. A name that is taken in
	 * the scope gets -2, -3, ... Without `attach` the skills exist but no ref points
	 * at them yet, as before.
	 */
	private async createSkillsBatch(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
		attach: boolean,
		context: AgentMutationTelemetryContext,
	): Promise<AgentSkillMutationResponse[]> {
		if (skills.length === 0) {
			throw new UserError('At least one skill is required.');
		}

		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (attach && !entity.schema) throw new UserError('Agent has no JSON config yet.');

		for (const skill of skills) {
			this.validateSkill(skill);
		}
		this.assertBatchSkillNamesAreUnique(skills);

		const previous = captureAgentMutation(entity);
		// A new skill may not have a name that is hard to tell apart from one the agent
		// already uses, in any scope. Clashes the agent already had are kept.
		const agentSkillNames = Object.values(
			await this.skillHub.resolveDraftSkills(entity.schema),
		).map((skill) => skill.name);
		const [clash] = findIntroducedNameClashes(
			agentSkillNames,
			skills.map((skill) => skill.name),
		);
		if (clash !== undefined) {
			throw new UserError(`Agent already has a skill with a name like "${clash.trim()}".`);
		}
		const created = await this.skillHubRepository.inTransaction(undefined, async (trx) => {
			const results: Array<{ id: string; skill: AgentSkill }> = [];
			for (const skill of skills) {
				const { id } = await this.skillHub.createSkillForAgent(
					projectId,
					skill,
					context.user.id,
					trx,
				);
				results.push({ id, skill });
			}
			if (attach) {
				for (const { id } of results) this.attachSkillRef(entity, id);
				markAgentDraftDirty(entity);
				await saveAgentDraftFenced(this.agentRepository, entity, trx);
				await this.skillHub.refreshDependencies(entity, trx);
			}
			return results;
		});

		if (attach) this.afterAgentWrite(entity, projectId, context, previous);

		this.logger.debug(attach ? 'Created and attached hub skill' : 'Created hub skills', {
			agentId,
			projectId,
			skillIds: created.map((r) => r.id),
		});

		return created.map((r) => ({
			...r,
			skillHash: getAgentSkillHash(r.skill),
			versionId: entity.versionId,
		}));
	}

	/**
	 * Autosave: overwrites the skill's draft row. No agent runs the draft, so nothing is
	 * marked as changed here; `saveSkill` turns the draft into the version agents read.
	 */
	async updateSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		updates: Partial<AgentSkill>,
		context: AgentMutationTelemetryContext,
		baseSkillHash?: string,
	): Promise<AgentSkillMutationResponse> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (!(entity.schema?.skills ?? []).some((ref) => ref.id === skillId)) {
			throw new NotFoundError('Skill not found');
		}

		const existing = (await this.skillHub.resolveEditableSkills(entity.schema))[skillId];
		if (!existing) throw new NotFoundError('Skill not found');
		if (baseSkillHash !== undefined && baseSkillHash !== getAgentSkillHash(existing)) {
			throw new ConflictError('Skill was changed elsewhere; reload to get the latest version');
		}

		const updated = { ...existing, ...updates };
		if ('allowedTools' in updates && !updates.allowedTools?.length) delete updated.allowedTools;
		if ('references' in updates && !updates.references?.length) delete updated.references;
		this.validateSkill(updated);

		if (isEqual(existing, updated)) {
			return {
				id: skillId,
				skill: updated,
				skillHash: getAgentSkillHash(updated),
				versionId: entity.versionId,
			};
		}

		// Editing needs the skill's own permission, not only agent:update on this agent.
		await this.skillHub.assertCanEditSkills(context.user, [skillId]);

		await this.skillHubRepository.inTransaction(undefined, async (trx) => {
			await this.skillHub.writeDraft(skillId, updated, trx);
		});
		// Other open editors of this skill learn that their draft copy is stale.
		this.agentUpdateBroadcaster.notify(
			{ projectId, agentId, source: context.modifiedBy },
			context.pushRef,
		);

		const stored = (await this.skillHub.resolveEditableSkills(entity.schema))[skillId] ?? updated;
		this.logger.debug('Updated hub skill draft', { agentId, projectId, skillId });

		return {
			id: skillId,
			skill: stored,
			skillHash: getAgentSkillHash(stored),
			versionId: entity.versionId,
		};
	}

	/**
	 * Save: turns the skill's draft row into the version agents read. Every agent that
	 * follows the skill gets a new draft version id (one fenced write each); agents that
	 * already have unpublished changes are not written. If this agent's ref pinned an
	 * older version (after a revert), the pin clears and the agent follows the latest.
	 */
	async saveSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		context: AgentMutationTelemetryContext,
	): Promise<{ id: string; versionId: string; version: number; created: boolean }> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (!(entity.schema?.skills ?? []).some((ref) => ref.id === skillId)) {
			throw new NotFoundError('Skill not found');
		}
		await this.skillHub.assertCanEditSkills(context.user, [skillId]);

		const previous = captureAgentMutation(entity);
		const { saved, dependents } = await this.skillHubRepository.inTransaction(
			undefined,
			async (trx) => {
				const saved = await this.skillHub.saveVersion(skillId, context.user.id, trx);
				if (this.skillHub.clearPin(entity.schema, skillId)) {
					markAgentDraftDirty(entity);
					await saveAgentDraftFenced(this.agentRepository, entity, trx);
					await this.skillHub.refreshDependencies(entity, trx);
				}
				const marked = saved.created
					? await this.skillHub.markDependentsDirty([skillId], [], trx, [agentId])
					: { dependents: [agentId], written: [] };
				return { saved, dependents: marked.dependents };
			},
		);
		await this.skillHub.clearRuntimes(dependents);
		for (const dependentId of dependents) {
			this.agentUpdateBroadcaster.notify(
				{ projectId, agentId: dependentId, source: context.modifiedBy },
				dependentId === agentId ? context.pushRef : undefined,
			);
		}
		const current = (await this.agentRepository.findByIdForDraftWrite(agentId)) ?? entity;
		this.modificationTelemetry.record(
			buildAgentMutationEvent(current, projectId, context, previous, { skills: true }),
		);
		this.logger.debug('Saved hub skill version', {
			agentId,
			projectId,
			skillId,
			...saved,
			dependents,
		});
		return { id: skillId, ...saved };
	}

	/** Detaches the skill from this agent's draft. The hub skill stays. */
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
		if (!entity.schema?.skills?.some((ref) => ref.id === skillId)) {
			throw new NotFoundError('Skill not found');
		}

		const previous = captureAgentMutation(entity);
		entity.schema.skills = entity.schema.skills.filter((ref) => ref.id !== skillId);
		await this.skillHubRepository.inTransaction(undefined, async (trx) => {
			markAgentDraftDirty(entity);
			await saveAgentDraftFenced(this.agentRepository, entity, trx);
			await this.skillHub.refreshDependencies(entity, trx);
		});
		this.afterAgentWrite(entity, projectId, context, previous);

		this.logger.debug('Detached hub skill', { agentId, projectId, skillId });
	}

	/** Kept for the config save path: detaching never deletes a hub skill. */
	removeUnreferencedSkills(_entity: Agent, _config: AgentJsonConfig): void {}

	private validateSkill(skill: AgentSkill): void {
		const result = agentSkillSchema.safeParse(skill);
		if (!result.success) {
			throw new UserError(
				`Invalid agent skill: ${result.error.issues[0]?.message ?? 'Invalid skill'}`,
			);
		}
	}

	private assertBatchSkillNamesAreUnique(skills: AgentSkill[]): void {
		const seenNames = new Set<string>();
		for (const skill of skills) {
			const key = skillNameKey(skill.name);
			if (seenNames.has(key)) {
				throw new UserError(`Duplicate skill name in batch: "${skill.name.trim()}".`);
			}
			seenNames.add(key);
		}
	}

	private attachSkillRef(entity: Agent, skillId: string): void {
		if (!entity.schema) throw new UserError('Agent has no JSON config yet.');

		entity.schema.skills = [
			...(entity.schema.skills ?? []).filter((ref) => ref.id !== skillId),
			{ type: 'skill', id: skillId },
		];
	}

	private afterAgentWrite(
		entity: Agent,
		projectId: string,
		context: AgentMutationTelemetryContext,
		previous: AgentMutationSnapshot,
	): void {
		this.agentUpdateBroadcaster.notify(
			{ projectId, agentId: entity.id, source: context.modifiedBy },
			context.pushRef,
		);
		void this.skillHub.clearRuntimes([entity.id]);
		this.modificationTelemetry.record(
			buildAgentMutationEvent(entity, projectId, context, previous, { skills: true }),
		);
	}
}
