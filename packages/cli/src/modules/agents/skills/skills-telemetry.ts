import type { SkillScope } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { Telemetry } from '@/telemetry';

import type { Skill } from '../entities/skill.entity';
import { SkillRepository } from '../repositories/skill.repository';

/** The surface that wrote the skill. Not `skill.source`, which has no MCP value. */
export type SkillTelemetrySource = 'ui' | 'agent' | 'mcp';

/** `manual` and `upload` come from the skill modal. `ai` is text an assistant wrote. */
export type SkillTelemetryMethod = 'manual' | 'upload' | 'ai';

type SkillPlace = { scope: SkillScope; project_id?: string };

/**
 * Skills hub telemetry. Callers emit only once the write commits and only with the hub
 * on. An emit never fails the write: an error is logged and dropped.
 */
@Service()
export class SkillsTelemetry {
	constructor(
		private readonly telemetry: Telemetry,
		private readonly skillRepository: SkillRepository,
		private readonly logger: Logger,
	) {}

	async created(
		userId: string,
		skillIds: string[],
		source: SkillTelemetrySource,
		method: SkillTelemetryMethod,
	): Promise<void> {
		await this.safely(async () => {
			const skills = await this.skillRepository.findByIds(skillIds);
			const placeOf = await this.placeResolver(skills);
			for (const skill of skills) {
				this.telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL, {
					user_id: userId,
					skill_id: skill.id,
					...placeOf(skill),
					source,
					method,
				});
			}
		});
	}

	/** Call only for a save that stored a new version. */
	async updated(
		userId: string,
		skillId: string,
		source: SkillTelemetrySource,
		version: number,
		scopeChanged: boolean,
	): Promise<void> {
		await this.safely(async () => {
			const [skill] = await this.skillRepository.findByIds([skillId]);
			if (!skill) return;
			const placeOf = await this.placeResolver([skill]);
			this.telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL, {
				user_id: userId,
				skill_id: skill.id,
				...placeOf(skill),
				source,
				version,
				scope_changed: scopeChanged,
			});
		});
	}

	/** Takes the skill as read before the delete, since the row is gone after it. */
	async deleted(userId: string, skill: Skill): Promise<void> {
		await this.safely(async () => {
			const placeOf = await this.placeResolver([skill]);
			this.telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL, {
				user_id: userId,
				skill_id: skill.id,
				...placeOf(skill),
			});
		});
	}

	/** An agent skill has no projectId of its own, so its project comes from its agent. */
	private async placeResolver(skills: Skill[]): Promise<(skill: Skill) => SkillPlace> {
		const agents = await this.skillRepository.findAgents(
			skills.flatMap((skill) => (skill.agentId ? [skill.agentId] : [])),
		);
		return (skill) => {
			if (skill.agentId) {
				const projectId = agents.get(skill.agentId)?.projectId;
				return { scope: 'agent', ...(projectId ? { project_id: projectId } : {}) };
			}
			if (skill.projectId) return { scope: 'project', project_id: skill.projectId };
			return { scope: 'instance' };
		};
	}

	private async safely(emit: () => Promise<void>): Promise<void> {
		try {
			await emit();
		} catch (error) {
			this.logger.warn('Could not send skills telemetry', { error: ensureError(error).message });
		}
	}
}
