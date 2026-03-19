import type {
	InstanceAiPhaseArtifact,
	InstanceAiPhaseBlocker,
	InstanceAiPhaseSpec,
	InstanceAiPhaseStatus,
	InstanceAiPlanSpec,
	InstanceAiPlanStatus,
} from '@n8n/api-types';

export function normalizePhase(
	phase: Omit<InstanceAiPhaseSpec, 'status' | 'artifacts'> &
		Partial<Pick<InstanceAiPhaseSpec, 'status' | 'artifacts'>>,
): InstanceAiPhaseSpec {
	return {
		...phase,
		status: phase.status ?? (phase.dependsOn.length > 0 ? 'pending' : 'ready'),
		artifacts: phase.artifacts ?? [],
	};
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

export function derivePlanStatus(
	plan: InstanceAiPlanSpec,
	fallbackStatus: InstanceAiPlanStatus,
): InstanceAiPlanStatus {
	if (plan.phases.length > 0 && plan.phases.every((phase) => phase.status === 'done')) {
		return 'completed';
	}

	if (plan.phases.some((phase) => phase.status === 'blocked')) {
		return 'blocked';
	}

	if (plan.phases.some((phase) => phase.status === 'building' || phase.status === 'verifying')) {
		return 'running';
	}

	return fallbackStatus;
}

export function updatePlanPhase(
	plan: InstanceAiPlanSpec,
	phaseId: string,
	status: InstanceAiPhaseStatus,
	blocker?: InstanceAiPhaseBlocker,
): InstanceAiPlanSpec {
	const nextPlan = {
		...plan,
		phases: plan.phases.map((phase) =>
			phase.id === phaseId
				? {
						...phase,
						status,
						...(status === 'blocked' && blocker ? { blocker } : { blocker: undefined }),
					}
				: phase,
		),
	};

	const fallbackStatus: InstanceAiPlanStatus =
		status === 'blocked'
			? 'blocked'
			: plan.status === 'awaiting_approval'
				? 'approved'
				: plan.status === 'draft'
					? 'draft'
					: plan.status;

	return {
		...nextPlan,
		status: derivePlanStatus(nextPlan, fallbackStatus),
		lastUpdatedAt: new Date().toISOString(),
	};
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
