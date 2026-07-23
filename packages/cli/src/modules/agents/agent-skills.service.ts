import {
	agentSkillSchema,
	type AgentJsonConfig,
	type AgentSkill,
	type AgentSkillMutationResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import { generateAgentResourceId } from './utils/agent-resource-id';

@Service()
export class AgentSkillsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
	) {}

	async listSkills(agentId: string, projectId: string): Promise<Record<string, AgentSkill>> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		return entity.skills ?? {};
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
	): Promise<AgentSkillMutationResponse> {
		const [result] = await this.createSkillsBatch(agentId, projectId, [skill], false);
		return result;
	}

	/**
	 * Create multiple skill bodies in one load/save/cache-clear. All-or-nothing:
	 * every skill is validated (including name uniqueness against existing
	 * skills and within the batch) before any mutation. Does not attach config
	 * refs — mirrors `createSkill`, just batched.
	 */
	async createSkills(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
	): Promise<AgentSkillMutationResponse[]> {
		return await this.createSkillsBatch(agentId, projectId, skills, false);
	}

	async createAndAttachSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const [result] = await this.createSkillsBatch(agentId, projectId, [skill], true);
		return result;
	}

	/**
	 * Shared implementation behind `createSkill`, `createSkills`, and
	 * `createAndAttachSkill`. Rejects an empty batch before touching the
	 * repository. Saves once and clears the runtime cache once.
	 */
	private async createSkillsBatch(
		agentId: string,
		projectId: string,
		skills: AgentSkill[],
		attach: boolean,
	): Promise<AgentSkillMutationResponse[]> {
		if (skills.length === 0) {
			throw new UserError('At least one skill is required.');
		}

		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		if (attach && !entity.schema) throw new UserError('Agent has no JSON config yet.');

		for (const skill of skills) {
			this.validateSkill(skill);
		}
		this.assertBatchSkillNamesAreUnique(entity.skills ?? {}, skills);

		const results = skills.map((skill) => ({ id: this.addSkill(entity, skill), skill }));
		if (attach) {
			for (const { id } of results) this.attachSkillRef(entity, id);
		}

		markAgentDraftDirty(entity);
		const saved = await this.agentRepository.save(entity);
		await this.clearRuntimes(agentId);

		this.logger.debug(attach ? 'Created and attached agent skill' : 'Created agent skills', {
			agentId,
			projectId,
			skillIds: results.map((r) => r.id),
		});

		return results.map((r) => ({ ...r, versionId: saved.versionId }));
	}

	async updateSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		updates: Partial<AgentSkill>,
	): Promise<AgentSkillMutationResponse> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const existing = entity.skills?.[skillId];
		if (!existing) throw new NotFoundError('Skill not found');

		const updated = { ...existing, ...updates };
		this.validateSkill(updated);
		this.assertSkillNameIsUnique(entity.skills ?? {}, updated.name, skillId);

		entity.skills = {
			...(entity.skills ?? {}),
			[skillId]: updated,
		};

		markAgentDraftDirty(entity);
		const saved = await this.agentRepository.save(entity);
		await this.clearRuntimes(agentId);

		this.logger.debug('Updated agent skill', { agentId, projectId, skillId });

		return { id: skillId, skill: updated, versionId: saved.versionId };
	}

	async deleteSkill(agentId: string, projectId: string, skillId: string): Promise<void> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const skills = { ...(entity.skills ?? {}) };
		if (!skills[skillId]) throw new NotFoundError('Skill not found');

		delete skills[skillId];
		entity.skills = skills;

		if (entity.schema?.skills) {
			entity.schema.skills = entity.schema.skills.filter((t) => t.id !== skillId);
		}

		markAgentDraftDirty(entity);
		await this.agentRepository.save(entity);
		await this.clearRuntimes(agentId);

		this.logger.debug('Deleted agent skill', { agentId, projectId, skillId });
	}

	removeUnreferencedSkills(entity: Agent, config: AgentJsonConfig): void {
		const referencedSkillIds = new Set((config.skills ?? []).map((t) => t.id));
		const orphanSkillIds = Object.keys(entity.skills ?? {}).filter(
			(id) => !referencedSkillIds.has(id),
		);
		if (orphanSkillIds.length === 0) return;

		const skills = { ...(entity.skills ?? {}) };
		for (const id of orphanSkillIds) {
			delete skills[id];
		}
		entity.skills = skills;
	}

	private validateSkill(skill: AgentSkill): void {
		const result = agentSkillSchema.safeParse(skill);
		if (!result.success) {
			throw new UserError(
				`Invalid agent skill: ${result.error.issues[0]?.message ?? 'Invalid skill'}`,
			);
		}
	}

	private addSkill(entity: Agent, skill: AgentSkill): string {
		const skillId = generateAgentResourceId('skill', Object.keys(entity.skills ?? {}));

		entity.skills = {
			...(entity.skills ?? {}),
			[skillId]: skill,
		};

		return skillId;
	}

	private assertSkillNameIsUnique(
		existing: Record<string, AgentSkill>,
		name: string,
		currentSkillId?: string,
	): void {
		const normalizedName = this.normalizeSkillName(name);
		const duplicate = Object.entries(existing ?? {}).find(
			([id, skill]) =>
				id !== currentSkillId && this.normalizeSkillName(skill.name) === normalizedName,
		);
		if (duplicate) {
			throw new UserError(`Agent already has a skill named "${name.trim()}".`);
		}
	}

	private normalizeSkillName(name: string): string {
		return name.trim().toLowerCase();
	}

	private assertBatchSkillNamesAreUnique(
		existing: Record<string, AgentSkill>,
		skills: AgentSkill[],
	): void {
		const seenNames = new Set<string>();
		for (const skill of skills) {
			this.assertSkillNameIsUnique(existing, skill.name);
			const normalizedName = this.normalizeSkillName(skill.name);
			if (seenNames.has(normalizedName)) {
				throw new UserError(`Duplicate skill name in batch: "${skill.name.trim()}".`);
			}
			seenNames.add(normalizedName);
		}
	}

	private attachSkillRef(entity: Agent, skillId: string): void {
		if (!entity.schema) throw new UserError('Agent has no JSON config yet.');

		entity.schema.skills = [
			...(entity.schema.skills ?? []).filter((ref) => ref.id !== skillId),
			{ type: 'skill', id: skillId },
		];
	}

	private async clearRuntimes(agentId: string): Promise<void> {
		const { AgentRuntimeCacheService } = await import('./agent-runtime-cache.service.js');
		Container.get(AgentRuntimeCacheService).clearRuntimes(agentId);
	}
}
