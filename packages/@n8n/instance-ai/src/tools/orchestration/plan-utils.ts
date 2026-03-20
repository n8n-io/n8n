import type {
	InstanceAiPhaseExecutionSpec,
	InstanceAiPhaseArtifact,
	InstanceAiPhaseBlocker,
	InstanceAiPhaseSpec,
	InstanceAiPhaseStatus,
	InstanceAiPlanSpec,
	InstanceAiPlanStatus,
} from '@n8n/api-types';

const COMPLETED_PHASE_STATUSES = new Set<InstanceAiPhaseStatus>(['done', 'failed']);
const ACTIVE_PHASE_STATUSES = new Set<InstanceAiPhaseStatus>(['building', 'verifying']);

function isCompletedPhase(phase: InstanceAiPhaseSpec): boolean {
	return COMPLETED_PHASE_STATUSES.has(phase.status);
}

function hasSatisfiedDependencies(plan: InstanceAiPlanSpec, phase: InstanceAiPhaseSpec): boolean {
	return phase.dependsOn.every((dependencyId) => {
		const dependency = plan.phases.find((candidate) => candidate.id === dependencyId);
		return dependency?.status === 'done';
	});
}

function findFailedDependency(
	plan: InstanceAiPlanSpec,
	phase: InstanceAiPhaseSpec,
): InstanceAiPhaseSpec | undefined {
	for (const dependencyId of phase.dependsOn) {
		const dependency = plan.phases.find((candidate) => candidate.id === dependencyId);
		if (dependency?.status === 'failed') {
			return dependency;
		}
	}

	return undefined;
}

function buildExecutionTaskFromPhase(phase: {
	description: string;
	objective: string;
	deliverable: string;
	verification: InstanceAiPhaseSpec['verification'];
}): string {
	return [
		phase.description,
		`Objective: ${phase.objective}`,
		`Deliverable: ${phase.deliverable}`,
		`Verification target: ${phase.verification.expectedOutcome}`,
	].join('\n\n');
}

function inferPhaseExecution(
	phase: Pick<
		InstanceAiPhaseSpec,
		'description' | 'objective' | 'deliverable' | 'targetResource' | 'verification'
	>,
): InstanceAiPhaseExecutionSpec | undefined {
	const task = buildExecutionTaskFromPhase(phase);
	if (phase.targetResource?.type === 'data-table') {
		return {
			kind: 'data-table',
			task,
		};
	}

	if (phase.targetResource?.type === 'workflow') {
		return {
			kind: 'workflow-build',
			task,
			...(phase.targetResource.id ? { workflowId: phase.targetResource.id } : {}),
		};
	}

	if (phase.verification.mode === 'run-workflow' || phase.verification.mode === 'trigger-only') {
		return { kind: 'workflow-build', task };
	}

	return undefined;
}

export function normalizePhase(
	phase: Omit<InstanceAiPhaseSpec, 'status' | 'artifacts'> &
		Partial<
			Pick<
				InstanceAiPhaseSpec,
				| 'status'
				| 'artifacts'
				| 'execution'
				| 'verificationAttempts'
				| 'lastVerificationError'
				| 'lastVerificationFailureSignature'
			>
		>,
): InstanceAiPhaseSpec {
	return {
		...phase,
		status: phase.status ?? (phase.dependsOn.length > 0 ? 'pending' : 'ready'),
		execution: phase.execution ?? inferPhaseExecution(phase),
		verificationAttempts: phase.verificationAttempts ?? 0,
		artifacts: phase.artifacts ?? [],
	};
}

export function getPhaseExecution(phase: InstanceAiPhaseSpec): InstanceAiPhaseExecutionSpec | undefined {
	return phase.execution ?? inferPhaseExecution(phase);
}

export function normalizePlanStatusForReview(
	status: InstanceAiPlanStatus | undefined,
): InstanceAiPlanStatus {
	if (status === undefined || status === 'draft') {
		return 'awaiting_approval';
	}

	return status;
}

export function replacePlanPhase(
	plan: InstanceAiPlanSpec,
	phase: InstanceAiPhaseSpec,
): InstanceAiPlanSpec {
	const hasPhase = plan.phases.some((existingPhase) => existingPhase.id === phase.id);

	return {
		...plan,
		phases: hasPhase
			? plan.phases.map((existingPhase) => (existingPhase.id === phase.id ? phase : existingPhase))
			: [...plan.phases, phase],
	};
}

export function reconcilePlanPhases(plan: InstanceAiPlanSpec): InstanceAiPlanSpec {
	let phases = plan.phases;
	let changed = false;

	for (let i = 0; i < plan.phases.length; i++) {
		const nextPhases: InstanceAiPhaseSpec[] = phases.map((phase) => {
			if (isCompletedPhase(phase)) return phase;

			const failedDependency = findFailedDependency({ ...plan, phases }, phase);
			if (failedDependency) {
				const reason = `Dependency phase "${failedDependency.title}" failed`;
				if (
					phase.status === 'failed' &&
					phase.lastVerificationFailureSignature === `dependency_failed:${failedDependency.id}` &&
					phase.lastVerificationError === reason
				) {
					return phase;
				}

				changed = true;
				return {
					...phase,
					status: 'failed',
					blocker: undefined,
					lastVerificationError: reason,
					lastVerificationFailureSignature: `dependency_failed:${failedDependency.id}`,
				};
			}

			if (phase.status === 'pending' && hasSatisfiedDependencies({ ...plan, phases }, phase)) {
				changed = true;
				return {
					...phase,
					status: 'ready',
				};
			}

			return phase;
		});

		phases = nextPhases;
	}

	return changed ? { ...plan, phases } : plan;
}

export function derivePlanStatus(
	plan: InstanceAiPlanSpec,
	fallbackStatus: InstanceAiPlanStatus,
): InstanceAiPlanStatus {
	if (plan.phases.length > 0 && plan.phases.every((phase) => isCompletedPhase(phase))) {
		return 'completed';
	}

	if (plan.phases.some((phase) => phase.status === 'blocked')) {
		return 'blocked';
	}

	if (plan.phases.some((phase) => ACTIVE_PHASE_STATUSES.has(phase.status))) {
		return 'running';
	}

	if (
		fallbackStatus === 'running' &&
		plan.phases.some((phase) => phase.status === 'ready' || phase.status === 'pending')
	) {
		return 'running';
	}

	return fallbackStatus;
}

export function patchPlanPhase(
	plan: InstanceAiPlanSpec,
	phaseId: string,
	patch: Partial<InstanceAiPhaseSpec>,
	fallbackStatus: InstanceAiPlanStatus = plan.status,
): InstanceAiPlanSpec {
	const nextPlan = {
		...plan,
		phases: plan.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...patch } : phase)),
	};

	const reconciledPlan = reconcilePlanPhases(nextPlan);

	return {
		...reconciledPlan,
		status: derivePlanStatus(reconciledPlan, fallbackStatus),
		lastUpdatedAt: new Date().toISOString(),
	};
}

export function updatePlanPhase(
	plan: InstanceAiPlanSpec,
	phaseId: string,
	status: InstanceAiPhaseStatus,
	blocker?: InstanceAiPhaseBlocker,
): InstanceAiPlanSpec {
	const fallbackStatus: InstanceAiPlanStatus =
		status === 'blocked'
			? 'blocked'
			: status === 'building' || status === 'verifying' || status === 'done' || status === 'failed'
				? 'running'
				: plan.status === 'awaiting_approval'
					? 'approved'
					: plan.status === 'draft'
						? 'draft'
						: plan.status;

	return patchPlanPhase(
		plan,
		phaseId,
		{
			status,
			blocker: status === 'blocked' ? blocker : undefined,
		},
		fallbackStatus,
	);
}

export function getRunnablePhaseIds(plan: InstanceAiPlanSpec): string[] {
	const reconciledPlan = reconcilePlanPhases(plan);

	return reconciledPlan.phases
		.filter(
			(phase) =>
				phase.status === 'ready' ||
				(phase.status === 'pending' && hasSatisfiedDependencies(reconciledPlan, phase)),
		)
		.map((phase) => phase.id);
}

export function shouldAutoContinuePlan(plan: InstanceAiPlanSpec): boolean {
	if (plan.status === 'draft' || plan.status === 'awaiting_approval' || plan.status === 'blocked') {
		return false;
	}

	if (plan.phases.length > 0 && plan.phases.every((phase) => isCompletedPhase(phase))) {
		return false;
	}

	if (plan.phases.some((phase) => ACTIVE_PHASE_STATUSES.has(phase.status))) {
		return true;
	}

	return getRunnablePhaseIds(plan).length > 0;
}

export function addPlanArtifact(
	plan: InstanceAiPlanSpec,
	phaseId: string,
	artifact: InstanceAiPhaseArtifact,
): InstanceAiPlanSpec {
	return {
		...plan,
		phases: plan.phases.map((phase) => {
			if (phase.id !== phaseId) return phase;
			if (phase.artifacts.some((existingArtifact) => existingArtifact.id === artifact.id)) {
				return phase;
			}

			return {
				...phase,
				artifacts: [...phase.artifacts, artifact],
			};
		}),
		lastUpdatedAt: new Date().toISOString(),
	};
}
