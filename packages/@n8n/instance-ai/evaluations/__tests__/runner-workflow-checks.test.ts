// ---------------------------------------------------------------------------
// Exercises the `runWorkflowChecks` helper exported from harness/runner.ts.
// The helper is the single seam through which both the orchestrator-build
// path (buildWorkflow) and the prebuilt path attach `workflowChecks` to the
// returned BuildResult. We mock the underlying check registry so the test
// stays fast and deterministic.
// ---------------------------------------------------------------------------

jest.mock('../binaryChecks/index', () => ({
	runBinaryChecks: jest.fn(),
}));

import { runBinaryChecks } from '../binaryChecks/index';
import type { WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { runWorkflowChecks } from '../harness/runner';
import type { CheckOutcome } from '../types';

const mockedRunBinaryChecks = jest.mocked(runBinaryChecks);

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const fakeWorkflow: WorkflowResponse = {
	id: 'wf-1',
	name: 'Demo',
	active: false,
	nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
	connections: {},
};

const sampleOutcomes: CheckOutcome[] = [
	{ name: 'has_trigger', description: 'd', kind: 'deterministic', status: 'pass' },
	{ name: 'all_nodes_connected', description: 'd', kind: 'deterministic', status: 'fail' },
];

beforeEach(() => {
	jest.clearAllMocks();
});

describe('runWorkflowChecks', () => {
	it('returns undefined when the workflow is missing', async () => {
		const result = await runWorkflowChecks({
			workflow: undefined,
			prompt: 'p',
			agentText: undefined,
			logger: silentLogger,
		});
		expect(result).toBeUndefined();
		expect(mockedRunBinaryChecks).not.toHaveBeenCalled();
	});

	it('returns the outcomes from the registry on success', async () => {
		mockedRunBinaryChecks.mockResolvedValue({ feedback: [], outcomes: sampleOutcomes });

		const result = await runWorkflowChecks({
			workflow: fakeWorkflow,
			prompt: 'build a webhook',
			agentText: 'done',
			logger: silentLogger,
		});

		expect(result).toEqual(sampleOutcomes);
		expect(mockedRunBinaryChecks).toHaveBeenCalledTimes(1);
		const ctx = mockedRunBinaryChecks.mock.calls[0][1];
		expect(ctx.prompt).toBe('build a webhook');
		expect(ctx.agentTextResponse).toBe('done');
	});

	it('omits agentTextResponse from the context when none is provided', async () => {
		mockedRunBinaryChecks.mockResolvedValue({ feedback: [], outcomes: [] });

		await runWorkflowChecks({
			workflow: fakeWorkflow,
			prompt: 'p',
			agentText: undefined,
			logger: silentLogger,
		});

		const ctx = mockedRunBinaryChecks.mock.calls[0][1];
		expect(ctx.agentTextResponse).toBeUndefined();
	});

	it('returns undefined and swallows registry errors so a check outage does not fail the build', async () => {
		mockedRunBinaryChecks.mockRejectedValue(new Error('registry exploded'));

		const result = await runWorkflowChecks({
			workflow: fakeWorkflow,
			prompt: 'p',
			agentText: undefined,
			logger: silentLogger,
		});

		expect(result).toBeUndefined();
	});
});
