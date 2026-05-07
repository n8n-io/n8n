import { agentSkillSchema, type AgentSkill, type AgentSkillMutationResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { Agent } from './entities/agent.entity';
import type { AgentJsonConfig } from './json-config/agent-json-config';
import { AgentRepository } from './repositories/agent.repository';
import { generateAgentResourceId } from './utils/agent-resource-id';

type AgentSkillEntries = Agent['skills'];

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
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		this.validateSkill(skill);

		const skillId = this.addSkill(entity, skill);

		markAgentDraftDirty(entity);
		const saved = await this.agentRepository.save(entity);

		this.logger.debug('Created agent skill', { agentId, projectId, skillId });

		return { id: skillId, skill, versionId: saved.versionId };
	}

	async createAndAttachSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		if (!entity.schema) throw new UserError('Agent has no JSON config yet.');

		this.validateSkill(skill);

		const skillId = this.addSkill(entity, skill);
		this.attachSkillRef(entity, skillId);

		markAgentDraftDirty(entity);
		const saved = await this.agentRepository.save(entity);

		this.logger.debug('Created and attached agent skill', { agentId, projectId, skillId });

		return { id: skillId, skill, versionId: saved.versionId };
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

		entity.skills = {
			...(entity.skills ?? {}),
			[skillId]: updated,
		};

		markAgentDraftDirty(entity);
		const saved = await this.agentRepository.save(entity);

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

	getMissingSkillIds(config: AgentJsonConfig | null, skills: AgentSkillEntries): string[] {
		const refs = config?.skills ?? [];
		const seen = new Set<string>();
		const missing: string[] = [];

		for (const ref of refs) {
			if (seen.has(ref.id)) continue;
			seen.add(ref.id);
			if (!skills[ref.id]) missing.push(ref.id);
		}

		return missing;
	}

	snapshotConfiguredSkills(
		config: AgentJsonConfig | null,
		skills: AgentSkillEntries,
	): AgentSkillEntries | null {
		if (!config) return null;
		const missing = this.getMissingSkillIds(config, skills);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing skill bodies: ${missing.join(', ')}`);
		}

		const snapshot: AgentSkillEntries = {};
		for (const ref of config.skills ?? []) {
			const skill = skills[ref.id];
			if (skill) snapshot[ref.id] = { ...skill };
		}
		return snapshot;
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

	private attachSkillRef(entity: Agent, skillId: string): void {
		if (!entity.schema) throw new UserError('Agent has no JSON config yet.');

		entity.schema.skills = [
			...(entity.schema.skills ?? []).filter((ref) => ref.id !== skillId),
			{ type: 'skill', id: skillId },
		];
	}
}
