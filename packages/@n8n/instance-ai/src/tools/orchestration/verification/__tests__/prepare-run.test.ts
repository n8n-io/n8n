import type { WorkflowBuildOutcome } from '../../../../workflow-loop/workflow-loop-state';
import { prepareVerificationRun } from '../prepare-run';

function makeBuildOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi_1',
		taskId: 'task_1',
		workflowId: 'wf_1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Built',
		...overrides,
	};
}

const gateVerdict = {
	nodeName: 'Email Approval',
	verdict: 'simulate' as const,
	reason: 'Send-and-wait gate on a loop',
	confidence: 'high' as const,
	source: 'deterministic' as const,
	haltBranch: true,
};

const plainVerdict = {
	nodeName: 'Send Message',
	verdict: 'simulate' as const,
	reason: 'Sends a message',
	confidence: 'high' as const,
	source: 'deterministic' as const,
};

describe('prepareVerificationRun — halted wait gates', () => {
	it('pins a halted gate with zero items, ignoring any stored fixture', () => {
		const result = prepareVerificationRun(
			makeBuildOutcome({
				nodeSimulationPlan: [gateVerdict, plainVerdict],
				simulationFixtures: {
					'Email Approval': [{ data: { Decision: 'Approve' } }],
					'Send Message': [{ ok: true }],
				},
			}),
			undefined,
		);

		expect(result.kind).toBe('ready');
		if (result.kind !== 'ready') return;
		expect(result.prepared.verificationPinData?.['Email Approval']).toEqual([]);
		expect(result.prepared.verificationPinData?.['Send Message']).toEqual([{ ok: true }]);
		expect(result.prepared.haltedGateNames).toEqual(['Email Approval']);
	});

	it('still pins a fixture-less simulated node with one empty item', () => {
		const result = prepareVerificationRun(
			makeBuildOutcome({ nodeSimulationPlan: [plainVerdict] }),
			undefined,
		);

		expect(result.kind).toBe('ready');
		if (result.kind !== 'ready') return;
		expect(result.prepared.verificationPinData?.['Send Message']).toEqual([{}]);
		expect(result.prepared.haltedGateNames).toEqual([]);
	});

	it('blocks fixture overrides that target a halted gate', () => {
		const result = prepareVerificationRun(makeBuildOutcome({ nodeSimulationPlan: [gateVerdict] }), {
			'Email Approval': [{ data: { Decision: 'Request changes' } }],
		});

		expect(result.kind).toBe('blocked');
		if (result.kind !== 'blocked') return;
		expect(result.result.guidance).toContain('human decision');
		expect(result.result.remediation?.category).toBe('blocked');
	});

	it('keeps applying overrides to ordinary simulated nodes', () => {
		const result = prepareVerificationRun(
			makeBuildOutcome({ nodeSimulationPlan: [gateVerdict, plainVerdict] }),
			{ 'Send Message': [{ ok: false }] },
		);

		expect(result.kind).toBe('ready');
		if (result.kind !== 'ready') return;
		expect(result.prepared.verificationPinData?.['Send Message']).toEqual([{ ok: false }]);
		expect(result.prepared.verificationPinData?.['Email Approval']).toEqual([]);
	});
});
