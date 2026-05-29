jest.mock('../harness/runner', () => ({
	buildWorkflow: jest.fn(),
	cleanupBuild: jest.fn(),
}));

jest.mock('../binaryChecks/index', () => ({
	runBinaryChecks: jest.fn(),
}));

import { runBinaryChecks } from '../binaryChecks/index';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import { buildWorkflow, cleanupBuild, type BuildResult } from '../harness/runner';
import { runSubAgent } from '../subagent/runner';

const mockedBuildWorkflow = jest.mocked(buildWorkflow);
const mockedCleanupBuild = jest.mocked(cleanupBuild);
const mockedRunBinaryChecks = jest.mocked(runBinaryChecks);

function makeWorkflow(): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Built workflow',
		active: false,
		versionId: 'version-1',
		nodes: [],
		connections: {},
	};
}

function makeClient(): N8nClient & { runSubAgentEval: jest.Mock } {
	return {
		runSubAgentEval: jest.fn(),
	} as unknown as N8nClient & { runSubAgentEval: jest.Mock };
}

describe('runSubAgent', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedCleanupBuild.mockResolvedValue(undefined);
		mockedRunBinaryChecks.mockResolvedValue({
			feedback: [
				{
					evaluator: 'binary-checks',
					metric: 'pass_rate',
					score: 1,
					kind: 'score',
				},
			],
			outcomes: [],
		});
	});

	it('runs legacy subagent fixtures through the orchestrator build harness', async () => {
		const workflow = makeWorkflow();
		const build: BuildResult = {
			success: true,
			workflowId: workflow.id,
			workflowJsons: [workflow],
			createdWorkflowIds: [workflow.id],
			createdDataTableIds: [],
			transcript: [{ agentText: 'Built the workflow.', toolInteractions: [] }],
		};
		mockedBuildWorkflow.mockResolvedValue(build);

		const client = makeClient();
		const preRunWorkflowIds = new Set(['existing-workflow']);
		const claimedWorkflowIds = new Set<string>();

		const result = await runSubAgent(
			{
				id: 'case-1',
				prompt: 'Build a webhook workflow',
				subagent: 'builder',
				systemPrompt: 'legacy override',
				tools: ['legacy-tool'],
				maxSteps: 5,
			},
			{
				modelId: 'anthropic/test-model',
				timeoutMs: 1234,
				maxSteps: 40,
				verbose: false,
			},
			{
				client,
				deleteAfterRun: true,
				preRunWorkflowIds,
				claimedWorkflowIds,
			},
		);

		expect(mockedBuildWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({
				client,
				conversation: [{ role: 'user', text: 'Build a webhook workflow' }],
				timeoutMs: 1234,
				preRunWorkflowIds,
				claimedWorkflowIds,
				skipWorkflowChecks: true,
			}),
		);
		expect(client.runSubAgentEval).not.toHaveBeenCalled();
		expect(mockedRunBinaryChecks).toHaveBeenCalledWith(
			workflow,
			expect.objectContaining({
				prompt: 'Build a webhook workflow',
				modelId: 'anthropic/test-model',
				agentTextResponse: 'Built the workflow.',
			}),
		);
		expect(mockedCleanupBuild).toHaveBeenCalledWith(client, build, expect.any(Object));
		expect(result.text).toBe('Built the workflow.');
		expect(result.capturedWorkflows).toHaveLength(1);
		expect(result.error).toBeUndefined();
	});

	it('returns failed feedback when the orchestrator produces no workflow', async () => {
		const build: BuildResult = {
			success: false,
			error: 'No workflow produced',
			workflowJsons: [],
			createdWorkflowIds: [],
			createdDataTableIds: [],
		};
		mockedBuildWorkflow.mockResolvedValue(build);

		const client = makeClient();

		const result = await runSubAgent(
			{ id: 'case-2', prompt: 'Build nothing' },
			{ timeoutMs: 1234, verbose: false },
			{
				client,
				deleteAfterRun: true,
				preRunWorkflowIds: new Set(),
				claimedWorkflowIds: new Set(),
			},
		);

		expect(client.runSubAgentEval).not.toHaveBeenCalled();
		expect(mockedRunBinaryChecks).not.toHaveBeenCalled();
		expect(mockedCleanupBuild).toHaveBeenCalledWith(client, build, expect.any(Object));
		expect(result.error).toBe('No workflow produced');
		expect(result.feedback).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ metric: 'run_error', score: 0 }),
				expect.objectContaining({ metric: 'workflow_produced', score: 0 }),
			]),
		);
	});
});
