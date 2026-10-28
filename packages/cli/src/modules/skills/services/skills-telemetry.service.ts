import type { SkillScope } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { Telemetry } from '@/telemetry';

import { SkillUsageProxy } from './skill-usage-proxy.service';
import type { Skill, SkillSource } from '../database/entities/skill.entity';
import { SkillRepository } from '../database/repositories/skill.repository';

/** Package imports report no skill telemetry. */
export type SkillTelemetrySource = Exclude<SkillSource, 'import'>;

/** `manual` and `upload` come from the skill modal. `ai` is text an assistant wrote. */
export type SkillTelemetryMethod = 'manual' | 'upload' | 'ai';

type SkillPlace = { scope: SkillScope; project_id?: string };

type SkillTelemetryTarget = Pick<Skill, 'id' | 'projectId' | 'agentId'>;

/**
 * A skill with the place the write put it. A bare id is read back after the write, and a
 * concurrent move can land before that read, so pass the place when the caller has it.
 */
export type SkillTelemetryRef = SkillTelemetryTarget | string;

/**
 * Skills telemetry. Callers emit only once the write commits, and only while the agents
 * module is on (`SkillsGate.isEnabled`). An emit never fails the write: an error is logged and dropped.
 */
@Service()
export class SkillsTelemetry {
	constructor(
		private readonly telemetry: Telemetry,
		private readonly skillRepository: SkillRepository,
		private readonly logger: Logger,
		private readonly skillUsage: SkillUsageProxy,
	) {}

	async created(
		userId: string,
		refs: SkillTelemetryRef[],
		source: SkillTelemetrySource,
		method: SkillTelemetryMethod,
	): Promise<void> {
		await this.safely(async () => {
			const skills = await this.resolve(refs);
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
		ref: SkillTelemetryRef,
		source: SkillTelemetrySource,
		version: number,
		scopeChanged: boolean,
	): Promise<void> {
		await this.safely(async () => {
			const [skill] = await this.resolve([ref]);
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
	async deleted(
		userId: string,
		skill: SkillTelemetryTarget,
		source: SkillTelemetrySource,
	): Promise<void> {
		await this.safely(async () => {
			const placeOf = await this.placeResolver([skill]);
			this.telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL, {
				user_id: userId,
				skill_id: skill.id,
				...placeOf(skill),
				source,
			});
		});
	}

	/** Reads back only the refs that came as a bare id, in one query. */
	private async resolve(refs: SkillTelemetryRef[]): Promise<SkillTelemetryTarget[]> {
		const ids = refs.filter((ref) => typeof ref === 'string');
		const read = ids.length > 0 ? await this.skillRepository.findByIds(ids) : [];
		return [...refs.filter((ref) => typeof ref !== 'string'), ...read];
	}

	/** An agent skill has no projectId of its own, so its project comes from its agent. */
	private async placeResolver(
		skills: SkillTelemetryTarget[],
	): Promise<(skill: SkillTelemetryTarget) => SkillPlace> {
		const agents = await this.skillUsage.findAgents(
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
