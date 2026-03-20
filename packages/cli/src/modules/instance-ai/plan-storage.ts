import { instanceAiPlanSpecSchema } from '@n8n/api-types';
import type { InstanceAiPhaseSpec, InstanceAiPlanSpec } from '@n8n/api-types';
import type { PlanStorage } from '@n8n/instance-ai';

import type { InstanceAiPlanStateRepository } from './repositories/instance-ai-plan-state.repository';

export class MastraPlanStorage implements PlanStorage {
	constructor(private readonly planStateRepo: InstanceAiPlanStateRepository) {}

	private static readonly MAX_SAVE_RETRIES = 5;

	private isDuplicateKeyError(error: unknown): boolean {
		if (!(error instanceof Error)) {
			return false;
		}

		const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
		return (
			error.name === 'QueryFailedError' ||
			code === '23505' ||
			code === 'SQLITE_CONSTRAINT' ||
			code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
			code === 'ER_DUP_ENTRY'
		);
	}

	private mergePhase(currentPhase: InstanceAiPhaseSpec, nextPhase: InstanceAiPhaseSpec): InstanceAiPhaseSpec {
		const currentStatus = currentPhase.status;
		const nextStatus = nextPhase.status;

		const shouldKeepCurrent =
			(currentStatus === 'done' && nextStatus !== 'done') ||
			(currentStatus === 'failed' && nextStatus !== 'failed') ||
			(currentStatus === 'ready' && nextStatus === 'pending') ||
			((currentStatus === 'building' || currentStatus === 'verifying') &&
				(nextStatus === 'pending' || nextStatus === 'ready')) ||
			(currentStatus === 'blocked' && (nextStatus === 'pending' || nextStatus === 'ready'));

		if (!shouldKeepCurrent) {
			return {
				...nextPhase,
				verificationAttempts: Math.max(
					currentPhase.verificationAttempts ?? 0,
					nextPhase.verificationAttempts ?? 0,
				),
				artifacts: [...currentPhase.artifacts, ...nextPhase.artifacts].filter(
					(artifact, index, artifacts) =>
						artifacts.findIndex((candidate) => candidate.id === artifact.id) === index,
				),
			};
		}

		return {
			...currentPhase,
			...nextPhase,
			status: currentPhase.status,
			blocker: currentPhase.blocker,
			lastVerificationError: currentPhase.lastVerificationError ?? nextPhase.lastVerificationError,
			lastVerificationFailureSignature:
				currentPhase.lastVerificationFailureSignature ?? nextPhase.lastVerificationFailureSignature,
			verificationAttempts: Math.max(
				currentPhase.verificationAttempts ?? 0,
				nextPhase.verificationAttempts ?? 0,
			),
			artifacts: [...currentPhase.artifacts, ...nextPhase.artifacts].filter(
				(artifact, index, artifacts) =>
					artifacts.findIndex((candidate) => candidate.id === artifact.id) === index,
			),
		};
	}

	private mergePlan(existingPlan: InstanceAiPlanSpec, nextPlan: InstanceAiPlanSpec): InstanceAiPlanSpec {
		if (existingPlan.planId !== nextPlan.planId) {
			return nextPlan;
		}

		const existingPhasesById = new Map(existingPlan.phases.map((phase) => [phase.id, phase]));

		return {
			...nextPlan,
			phases: nextPlan.phases.map((phase) => {
				const currentPhase = existingPhasesById.get(phase.id);
				return currentPhase ? this.mergePhase(currentPhase, phase) : phase;
			}),
		};
	}

	async get(threadId: string): Promise<InstanceAiPlanSpec | null> {
		const entity = await this.planStateRepo.findOneBy({ threadId });
		if (!entity) return null;
		const result = instanceAiPlanSpecSchema.safeParse(entity.plan);
		return result.success ? result.data : null;
	}

	async save(threadId: string, plan: InstanceAiPlanSpec): Promise<void> {
		for (let attempt = 0; attempt < MastraPlanStorage.MAX_SAVE_RETRIES; attempt++) {
			const existing = await this.planStateRepo.findOneBy({ threadId });
			const parsedExistingPlan = existing ? instanceAiPlanSpecSchema.safeParse(existing.plan) : null;
			const mergedPlan =
				parsedExistingPlan?.success === true ? this.mergePlan(parsedExistingPlan.data, plan) : plan;

			if (!existing) {
				try {
					await this.planStateRepo.insert({
						threadId,
						planId: mergedPlan.planId,
						version: 1,
						plan: mergedPlan,
					});
					return;
				} catch (error) {
					if (this.isDuplicateKeyError(error)) {
						continue;
					}
					throw error;
				}
			}

			const updateResult = await this.planStateRepo.update(
				{
					threadId,
					version: existing.version,
				},
				{
					planId: mergedPlan.planId,
					version: existing.version + 1,
					plan: mergedPlan,
				},
			);

			if ((updateResult.affected ?? 0) > 0) {
				return;
			}
		}

		throw new Error(`Failed to persist Instance AI plan state for thread ${threadId}`);
	}
}
