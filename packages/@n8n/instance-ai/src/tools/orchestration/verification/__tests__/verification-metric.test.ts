import { emitBuilderMetric } from '../../../../tracing/builder-metric-event';
import type { InstanceAiTraceContext } from '../../../../types';
import type { VerificationClaim } from '../../../../workflow-loop/workflow-loop-state';
import { emitWorkflowVerificationMetric } from '../verification-metric';

vi.mock('../../../../tracing/builder-metric-event', () => ({
	emitBuilderMetric: vi.fn(async () => await Promise.resolve()),
}));

const tracing = {} as InstanceAiTraceContext;

function claim(level: VerificationClaim['level']): VerificationClaim {
	return {
		level,
		plannedNodeCount: 3,
		reachedNodeCount: 2,
		nodesNotReached: ['Send email'],
		simulatedNodes: [{ nodeName: 'Slack', reason: 'mocked_credential' }],
		pinnedNodes: [],
		unprovenTargets: [],
		publishReady: level === 'verified',
		liveTestRecommended: level !== 'verified',
	};
}

describe('emitWorkflowVerificationMetric', () => {
	beforeEach(() => {
		vi.mocked(emitBuilderMetric).mockClear();
	});

	it('counts a verified claim as success', async () => {
		await emitWorkflowVerificationMetric(tracing, {
			source: 'verify',
			workflowId: 'wf-1',
			workItemId: 'wi_1',
			executionId: 'exec-1',
			claim: claim('verified'),
		});

		expect(emitBuilderMetric).toHaveBeenCalledWith(tracing, 'workflow_verification', {
			success: true,
			source: 'verify',
			claim_level: 'verified',
			planned_node_count: 3,
			reached_node_count: 2,
			nodes_not_reached_count: 1,
			simulated_node_count: 1,
			live_test_recommended: false,
			reason: undefined,
			workflow_id: 'wf-1',
			work_item_id: 'wi_1',
			execution_id: 'exec-1',
		});
	});

	it.each(['partial', 'unproven', 'failed'] as const)(
		'does not count a %s claim as success',
		async (level) => {
			await emitWorkflowVerificationMetric(tracing, {
				source: 'verify',
				workflowId: 'wf-1',
				workItemId: 'wi_1',
				claim: claim(level),
			});

			expect(emitBuilderMetric).toHaveBeenCalledWith(
				tracing,
				'workflow_verification',
				expect.objectContaining({ success: false, claim_level: level }),
			);
		},
	);

	it('records verification that did not run, with its reason', async () => {
		await emitWorkflowVerificationMetric(tracing, {
			source: 'blocked',
			workflowId: 'wf-1',
			workItemId: 'wi_1',
			reason: 'missing_simulation_plan',
		});

		expect(emitBuilderMetric).toHaveBeenCalledWith(
			tracing,
			'workflow_verification',
			expect.objectContaining({
				success: false,
				source: 'blocked',
				claim_level: undefined,
				reason: 'missing_simulation_plan',
			}),
		);
	});
});
