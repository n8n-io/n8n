import {
	agentSkillSchema,
	type AgentJsonConfig,
	type AgentSkill,
	type AgentSkillMutationResponse,
	type AgentSkillReference,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { createHash } from 'crypto';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { AgentSkillDefinition, type StoredSkillLinkedFiles } from './entities/agent-skill.entity';
import { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSkillSnapshotRepository } from './repositories/agent-skill-snapshot.repository';
import { AgentSkillRepository } from './repositories/agent-skill.repository';
import { generateAgentResourceId } from './utils/agent-resource-id';

type SkillFields = Pick<AgentSkill, 'name' | 'description' | 'instructions'> & {
	allowedTools?: string[] | null;
	recommendedTools?: string[] | null;
	interface?: AgentSkill['interface'] | null;
	policy?: AgentSkill['policy'] | null;
	dependencies?: AgentSkill['dependencies'] | null;
	version?: string | null;
	license?: string | null;
	compatibility?: string | null;
	platforms?: string[] | null;
	metadata?: Record<string, unknown> | null;
};

@Service()
export class AgentSkillsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly skillRepository: AgentSkillRepository,
		private readonly skillSnapshotRepository: AgentSkillSnapshotRepository,
	) {}

	async listSkills(agentId: string, projectId: string): Promise<Record<string, AgentSkill>> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		return await this.getSkillMapForAgent(agentId);
	}

	async getSkill(agentId: string, projectId: string, skillId: string): Promise<AgentSkill> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const definition = await this.skillRepository.findByIdAndAgentId(skillId, agentId);
		if (!definition) throw new NotFoundError('Skill not found');

		return this.toSkill(definition);
	}

	async createSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		this.validateSkill(skill);
		const normalizedSkill = this.withNormalizedReferences(skill);

		const existing = await this.skillRepository.findByAgentId(agentId);
		const skillId = generateAgentResourceId(
			'skill',
			existing.map((entry) => entry.id),
		);
		const saved = await this.agentRepository.manager.transaction(async (trx) => {
			await trx.save(this.toDefinition(skillId, agentId, normalizedSkill));
			markAgentDraftDirty(entity);
			return await trx.save(entity);
		});
		await this.clearRuntimes(agentId);

		this.logger.debug('Created agent skill', { agentId, projectId, skillId });

		return { id: skillId, skill: normalizedSkill, versionId: saved.versionId };
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
		const normalizedSkill = this.withNormalizedReferences(skill);

		const existing = await this.skillRepository.findByAgentId(agentId);
		const skillId = generateAgentResourceId(
			'skill',
			existing.map((entry) => entry.id),
		);
		const saved = await this.agentRepository.manager.transaction(async (trx) => {
			await trx.save(this.toDefinition(skillId, agentId, normalizedSkill));
			this.attachSkillRef(entity, skillId);
			markAgentDraftDirty(entity);
			return await trx.save(entity);
		});
		await this.clearRuntimes(agentId);

		this.logger.debug('Created and attached agent skill', { agentId, projectId, skillId });

		return { id: skillId, skill: normalizedSkill, versionId: saved.versionId };
	}

	async updateSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		updates: Partial<AgentSkill>,
	): Promise<AgentSkillMutationResponse> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const definition = await this.skillRepository.findByIdAndAgentId(skillId, agentId);
		if (!definition) throw new NotFoundError('Skill not found');
		const existing = this.toSkill(definition);

		const updated = { ...existing, ...updates };
		this.validateSkill(updated);
		const normalizedUpdated = this.withNormalizedReferences(updated);

		const saved = await this.agentRepository.manager.transaction(async (trx) => {
			await trx.save(this.assignDefinition(definition, normalizedUpdated));
			markAgentDraftDirty(entity);
			return await trx.save(entity);
		});
		await this.clearRuntimes(agentId);

		this.logger.debug('Updated agent skill', { agentId, projectId, skillId });

		return {
			id: skillId,
			skill: normalizedUpdated,
			versionId: saved.versionId,
		};
	}

	async deleteSkill(agentId: string, projectId: string, skillId: string): Promise<void> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const skill = await this.skillRepository.findByIdAndAgentId(skillId, agentId);
		if (!skill) throw new NotFoundError('Skill not found');

		if (entity.schema?.skills) {
			entity.schema.skills = entity.schema.skills.filter((t) => t.id !== skillId);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			await trx.remove(skill);
			markAgentDraftDirty(entity);
			await trx.save(entity);
		});
		await this.clearRuntimes(agentId);

		this.logger.debug('Deleted agent skill', { agentId, projectId, skillId });
	}

	async removeUnreferencedSkills(entity: Agent, config: AgentJsonConfig): Promise<void> {
		const referencedSkillIds = new Set((config.skills ?? []).map((t) => t.id));
		const existing = await this.skillRepository.findByAgentId(entity.id);
		const orphanSkillIds = existing
			.map((skill) => skill.id)
			.filter((id) => !referencedSkillIds.has(id));
		if (orphanSkillIds.length === 0) return;

		await this.skillRepository.delete(orphanSkillIds);
	}

	async getMissingSkillIds(config: AgentJsonConfig | null, agentId: string): Promise<string[]> {
		const refs = config?.skills ?? [];
		if (refs.length === 0) return [];
		const existing = new Set(
			(await this.skillRepository.findByAgentId(agentId)).map((skill) => skill.id),
		);
		const seen = new Set<string>();
		const missing: string[] = [];

		for (const ref of refs) {
			if (seen.has(ref.id)) continue;
			seen.add(ref.id);
			if (!existing.has(ref.id)) missing.push(ref.id);
		}

		return missing;
	}

	async snapshotConfiguredSkills(
		trx: EntityManager,
		versionId: string,
		agentId: string,
		config: AgentJsonConfig | null,
	): Promise<void> {
		if (!config) return;
		const refs = config.skills ?? [];
		if (refs.length === 0) return;

		const bodies = await trx.getRepository(AgentSkillDefinition).findBy({ agentId });
		const byId = new Map(bodies.map((body) => [body.id, body]));
		const missing = refs.filter((ref) => !byId.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing skill bodies: ${missing.join(', ')}`);
		}

		await this.skillSnapshotRepository.saveForVersion(
			refs.map((ref) => {
				const body = byId.get(ref.id);
				if (!body) throw new UserError(`Cannot publish agent with missing skill body: ${ref.id}`);
				return {
					versionId,
					skillId: ref.id,
					name: body.name,
					description: body.description,
					instructions: body.instructions,
					allowedTools: body.allowedTools,
					recommendedTools: body.recommendedTools,
					interfaceData: body.interfaceData,
					policy: body.policy,
					dependencies: body.dependencies,
					versionName: body.version,
					license: body.license,
					compatibility: body.compatibility,
					platforms: body.platforms,
					metadata: body.metadata,
					linkedFiles: body.linkedFiles,
				};
			}),
			trx,
		);
	}

	async restoreSkillsFromSnapshot(
		trx: EntityManager,
		agentId: string,
		versionId: string,
	): Promise<void> {
		const definitionRepo = trx.getRepository(AgentSkillDefinition);
		const existing = await definitionRepo.findBy({ agentId });
		const snapshots = await this.skillSnapshotRepository.findByVersionId(versionId, trx);
		const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.skillId));

		const orphanIds = existing.filter((row) => !snapshotIds.has(row.id)).map((row) => row.id);
		if (orphanIds.length > 0) await definitionRepo.delete(orphanIds);

		for (const snapshot of snapshots) {
			await definitionRepo.save({
				id: snapshot.skillId,
				agentId,
				name: snapshot.name,
				description: snapshot.description,
				instructions: snapshot.instructions,
				allowedTools: snapshot.allowedTools,
				recommendedTools: snapshot.recommendedTools,
				interfaceData: snapshot.interfaceData,
				policy: snapshot.policy,
				dependencies: snapshot.dependencies,
				version: snapshot.versionName,
				license: snapshot.license,
				compatibility: snapshot.compatibility,
				platforms: snapshot.platforms,
				metadata: snapshot.metadata,
				linkedFiles: snapshot.linkedFiles,
			});
		}
	}

	async getSkillMapForAgent(agentId: string): Promise<Record<string, AgentSkill>> {
		const definitions = await this.skillRepository.findByAgentId(agentId);
		return this.toSkillMap(definitions);
	}

	async getSkillMapForVersion(versionId: string): Promise<Record<string, AgentSkill>> {
		const snapshots = await this.skillSnapshotRepository.findByVersionId(versionId);
		const out: Record<string, AgentSkill> = {};
		for (const snapshot of snapshots) {
			const references = this.referencesFromLinkedFiles(snapshot.linkedFiles);
			out[snapshot.skillId] = {
				...this.withOptionalSkillFields({
					name: snapshot.name,
					description: snapshot.description,
					instructions: snapshot.instructions,
					allowedTools: snapshot.allowedTools,
					recommendedTools: snapshot.recommendedTools,
					interface: snapshot.interfaceData,
					policy: snapshot.policy,
					dependencies: snapshot.dependencies,
					version: snapshot.versionName,
					license: snapshot.license,
					compatibility: snapshot.compatibility,
					platforms: snapshot.platforms,
					metadata: snapshot.metadata,
				}),
				...(references.length > 0 ? { references } : {}),
			};
		}
		return out;
	}

	private validateSkill(skill: AgentSkill): void {
		const result = agentSkillSchema.safeParse(skill);
		if (!result.success) {
			throw new UserError(
				`Invalid agent skill: ${result.error.issues[0]?.message ?? 'Invalid skill'}`,
			);
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
		const { AgentRuntimeCacheService } = await import('./agent-runtime-cache.service');
		Container.get(AgentRuntimeCacheService).clearRuntimes(agentId);
	}

	private toSkillMap(definitions: AgentSkillDefinition[]): Record<string, AgentSkill> {
		const out: Record<string, AgentSkill> = {};
		for (const definition of definitions) {
			out[definition.id] = this.toSkill(definition);
		}
		return out;
	}

	private toSkill(definition: AgentSkillDefinition): AgentSkill {
		const references = this.referencesFromLinkedFiles(definition.linkedFiles);
		return {
			...this.withOptionalSkillFields({
				name: definition.name,
				description: definition.description,
				instructions: definition.instructions,
				allowedTools: definition.allowedTools,
				recommendedTools: definition.recommendedTools,
				interface: definition.interfaceData,
				policy: definition.policy,
				dependencies: definition.dependencies,
				version: definition.version,
				license: definition.license,
				compatibility: definition.compatibility,
				platforms: definition.platforms,
				metadata: definition.metadata,
			}),
			...(references.length > 0 ? { references } : {}),
		};
	}

	private withOptionalSkillFields(skill: SkillFields): AgentSkill {
		return {
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
			...(skill.allowedTools ? { allowedTools: skill.allowedTools } : {}),
			...(skill.recommendedTools ? { recommendedTools: skill.recommendedTools } : {}),
			...(skill.interface ? { interface: skill.interface } : {}),
			...(skill.policy ? { policy: skill.policy } : {}),
			...(skill.dependencies ? { dependencies: skill.dependencies } : {}),
			...(skill.version ? { version: skill.version } : {}),
			...(skill.license ? { license: skill.license } : {}),
			...(skill.compatibility ? { compatibility: skill.compatibility } : {}),
			...(skill.platforms ? { platforms: skill.platforms } : {}),
			...(skill.metadata ? { metadata: skill.metadata } : {}),
		};
	}

	private toDefinition(skillId: string, agentId: string, skill: AgentSkill): AgentSkillDefinition {
		return this.assignDefinition(
			this.skillRepository.create({
				id: skillId,
				agentId,
			}),
			skill,
		);
	}

	private assignDefinition(
		definition: AgentSkillDefinition,
		skill: AgentSkill,
	): AgentSkillDefinition {
		definition.name = skill.name;
		definition.description = skill.description;
		definition.instructions = skill.instructions;
		definition.allowedTools = skill.allowedTools ?? null;
		definition.recommendedTools = skill.recommendedTools ?? null;
		definition.interfaceData = skill.interface ?? null;
		definition.policy = skill.policy ?? null;
		definition.dependencies = skill.dependencies ?? null;
		definition.version = skill.version ?? null;
		definition.license = skill.license ?? null;
		definition.compatibility = skill.compatibility ?? null;
		definition.platforms = skill.platforms ?? null;
		definition.metadata = skill.metadata ?? null;
		definition.linkedFiles = this.toStoredLinkedFiles(skill);
		return definition;
	}

	private normalizeReferences(
		references: AgentSkillReference[] | undefined,
	): AgentSkillReference[] {
		if (!references) return [];
		return references.map((reference) => {
			const content = reference.content;
			return {
				path: reference.path,
				content,
				bytes: Buffer.byteLength(content, 'utf8'),
				sha256: createHash('sha256').update(content).digest('hex'),
			};
		});
	}

	private toStoredLinkedFiles(skill: AgentSkill): StoredSkillLinkedFiles {
		return {
			references: this.normalizeReferences(skill.references),
		};
	}

	private referencesFromLinkedFiles(
		linkedFiles: StoredSkillLinkedFiles | null,
	): AgentSkillReference[] {
		return this.normalizeReferences(linkedFiles?.references);
	}

	private withNormalizedReferences(skill: AgentSkill): AgentSkill {
		if (skill.references === undefined) return skill;
		return {
			...skill,
			references: this.normalizeReferences(skill.references),
		};
	}
}
