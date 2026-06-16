import { getTestCaseAnchorId } from '../report/report-anchors';
import { generateRunDebugReport } from '../report/run-debug-report';
import type { WorkflowTestCase, WorkflowTestCaseResult } from '../types';

const TEST_CASE: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'Build a Slack notifier' }],
	complexity: 'simple',
	tags: [],
	executionScenarios: [{ name: 's', description: 'd', dataSetup: '', successCriteria: 'ok' }],
	datasets: ['full'],
};

function resultWithRunDebug(
	runDebug: WorkflowTestCaseResult['runDebug'],
	overrides: Partial<WorkflowTestCaseResult> = {},
): WorkflowTestCaseResult {
	return {
		testCase: TEST_CASE,
		workflowBuildSuccess: true,
		executionScenarioResults: [],
		fileSlug: 'slack-notifier',
		threadId: 'thread-1',
		runDebug,
		...overrides,
	};
}

describe('run debug report', () => {
	it('renders runs, steps, and escaped user content', () => {
		const html = generateRunDebugReport([
			resultWithRunDebug([
				{
					threadId: 'thread-1',
					runId: 'run-1',
					startedAt: 1_700_000_000_000,
					label: 'Build a Slack notifier',
					steps: [
						{
							stepNumber: 0,
							input: {
								system: 'You are helpful <script>alert(1)</script>',
								messages: [{ role: 'user', content: 'Build a Slack notifier' }],
							},
							output: {
								finishReason: 'tool-calls',
								toolCalls: [{ toolName: 'search_nodes', input: { query: 'slack' } }],
								usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
							},
						},
					],
					workflowCode: [],
				},
			]),
		]);

		expect(html).toContain('id="tc-slack-notifier"');
		expect(html).toContain('Build a Slack notifier');
		expect(html).toContain('search_nodes');
		expect(html).toContain('tool-calls');
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(html).toContain('selectRun(');
		expect(html).toContain('selectStep(');
	});

	it('uses stable anchor ids from file slugs', () => {
		const result = resultWithRunDebug([]);
		expect(getTestCaseAnchorId(result, 0)).toBe('tc-slack-notifier');
	});

	it('renders an empty-state stub when no debug was captured', () => {
		const html = generateRunDebugReport([
			{
				testCase: TEST_CASE,
				workflowBuildSuccess: false,
				executionScenarioResults: [],
			},
		]);

		expect(html).toContain('No LLM run debug was captured');
		expect(html).toContain('N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true');
		expect(html).toContain('Workflow eval — LLM debug');
	});
});
