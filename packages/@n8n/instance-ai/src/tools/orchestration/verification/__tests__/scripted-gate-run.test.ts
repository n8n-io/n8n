import type {
	WaitGateScript,
	WorkflowBuildOutcome,
} from '../../../../workflow-loop/workflow-loop-state';
import type { PreparedVerificationRun } from '../prepare-run';
import { runScriptedGateVerification, type ScriptedGateRunArgs } from '../scripted-gate-run';

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

const script: WaitGateScript = {
	nodeName: 'Gate',
	cutEdge: { source: 'Revise', target: 'Format' },
	decisions: [
		{ label: 'approve', items: [{ data: { approved: true } }] },
		{ label: 'decline', items: [{ data: { approved: false } }] },
	],
};

const prepared: PreparedVerificationRun = {
	verificationPinData: { Gate: [], Generate: [{ text: 'draft' }] },
	simulatedNodes: [
		{ nodeName: 'Gate', reason: 'gate' },
		{ nodeName: 'Generate', reason: 'no credentials' },
	],
	haltedGateNames: ['Gate'],
	gateScript: script,
};

const approvePassResult = {
	executionId: 'exec-approve',
	status: 'success',
	executedNodeNames: ['Trigger', 'Generate', 'Gate', 'Router', 'Publish'],
	lastNodeExecuted: 'Publish',
	data: { Publish: [{ ok: true }] },
};

const declinePassResult = {
	executionId: 'exec-decline',
	status: 'success',
	executedNodeNames: ['Trigger', 'Generate', 'Gate', 'Router', 'Revise'],
	lastNodeExecuted: 'Revise',
	data: { Revise: [{ text: 'revised' }] },
};

function makeArgs(runMock: ReturnType<typeof vi.fn>): ScriptedGateRunArgs {
	return {
		script,
		prepared,
		executionService: { run: runMock } as unknown as ScriptedGateRunArgs['executionService'],
		workflowId: 'wf_1',
		timeout: 30_000,
		buildOutcome: makeBuildOutcome({
			nodeSimulationPlan: [
				{
					nodeName: 'Gate',
					verdict: 'simulate',
					reason: 'gate',
					confidence: 'high',
					source: 'deterministic',
					haltBranch: true,
				},
			],
		}),
		stateBefore: undefined,
		runId: 'run-1',
	};
}

describe('runScriptedGateVerification', () => {
	it('runs one pass per decision with the gate pin swapped and the loop edge cut', async () => {
		const run = vi
			.fn()
			.mockResolvedValueOnce(approvePassResult)
			.mockResolvedValueOnce(declinePassResult);

		const { result, analysis } = await runScriptedGateVerification(makeArgs(run));

		expect(run).toHaveBeenCalledTimes(2);
		type RunOptions = {
			verificationPinData?: Record<string, unknown[]>;
			omitConnections?: Array<{ source: string; target: string }>;
		};
		const optionsOfCall = (index: number): RunOptions =>
			(run.mock.calls[index] as unknown[])[2] as RunOptions;
		const firstOptions = optionsOfCall(0);
		const secondOptions = optionsOfCall(1);
		expect(firstOptions.verificationPinData?.Gate).toEqual([{ data: { approved: true } }]);
		expect(secondOptions.verificationPinData?.Gate).toEqual([{ data: { approved: false } }]);
		// Base pins for other simulated nodes ride along on every pass.
		expect(firstOptions.verificationPinData?.Generate).toEqual([{ text: 'draft' }]);
		expect(firstOptions.omitConnections).toEqual([{ source: 'Revise', target: 'Format' }]);

		expect(analysis.success).toBe(true);
		expect(analysis.nodesExecuted).toEqual(expect.arrayContaining(['Publish', 'Revise']));
		expect(analysis.coverageNote).toContain('"approve" ended at "Publish"');
		expect(analysis.coverageNote).toContain('"decline" ended at "Revise"');
		expect(analysis.coverageNote).toContain('"Revise" → "Format"');
		expect(result.executedNodeNames).toEqual(expect.arrayContaining(['Publish', 'Revise']));
	});

	it('fails the merged analysis when any pass fails', async () => {
		const run = vi
			.fn()
			.mockResolvedValueOnce(approvePassResult)
			.mockResolvedValueOnce({
				...declinePassResult,
				status: 'error',
				error: 'expression error in Revise',
			});

		const { analysis } = await runScriptedGateVerification(makeArgs(run));

		expect(analysis.success).toBe(false);
		expect(analysis.errorMessage).toContain('expression error');
		expect(analysis.remediation).toBeDefined();
	});
});

describe('runScriptedGateVerification — merge consistency', () => {
	it('normalizes the merged status when a pass fails on node errors despite engine success', async () => {
		const run = vi
			.fn()
			.mockResolvedValueOnce(approvePassResult)
			.mockResolvedValueOnce({
				...declinePassResult,
				status: 'success',
				nodeErrors: [{ nodeName: 'Revise', message: 'expression error' }],
			});

		const { result, analysis } = await runScriptedGateVerification(makeArgs(run));

		expect(analysis.success).toBe(false);
		expect(result.status).toBe('error');
	});

	it('discloses simulated nodes reached only in an earlier pass', async () => {
		const run = vi
			.fn()
			.mockResolvedValueOnce(approvePassResult)
			.mockResolvedValueOnce(declinePassResult);

		const args = makeArgs(run);
		args.prepared = {
			...prepared,
			simulatedNodes: [...prepared.simulatedNodes, { nodeName: 'Publish', reason: 'no creds' }],
		};

		const { analysis } = await runScriptedGateVerification(args);

		// Publish is reached only by the approve pass; the decline pass ran last.
		expect(analysis.simulationNote).toContain('Publish');
	});
});
