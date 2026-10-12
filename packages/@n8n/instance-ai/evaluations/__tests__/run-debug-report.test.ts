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

	it('renders an AI SDK instructions prompt as the system block', () => {
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
								instructions: { role: 'system', content: 'Kimi system prompt' },
								messages: [{ role: 'user', content: 'hello' }],
							},
						},
					],
					workflowCode: [],
				},
			]),
		]);

		expect(html).toContain('Kimi system prompt');
	});

	it('renders step settings, sorted tools, usage rows, and the cache break', () => {
		const instructions = {
			role: 'system',
			content: 'system prompt',
			providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
		};
		const stepTools = [
			{ type: 'function', name: 'small_tool', description: 'x' },
			{ type: 'function', name: 'large_tool', description: 'x'.repeat(2_000) },
		];
		const cachedStep = (
			stepNumber: number,
			cacheReadTokens: number,
			cacheWriteTokens: number,
			timestamp: string,
		) => ({
			stepNumber,
			input: { instructions, stepTools, modelId: 'claude-sonnet' },
			output: {
				finishReason: 'tool-calls',
				usage: {
					inputTokens: cacheReadTokens + cacheWriteTokens + 3,
					inputTokenDetails: { noCacheTokens: 3, cacheReadTokens, cacheWriteTokens },
					outputTokens: 40,
					totalTokens: cacheReadTokens + cacheWriteTokens + 43,
				},
				response: { timestamp },
			},
		});

		const html = generateRunDebugReport([
			resultWithRunDebug([
				{
					threadId: 'thread-1',
					runId: 'run-1',
					startedAt: 1_700_000_000_000,
					label: 'Build a Slack notifier',
					steps: [
						cachedStep(0, 0, 30_000, '2026-01-01T00:00:00.000Z'),
						cachedStep(1, 0, 30_000, '2026-01-01T00:06:00.000Z'),
					],
					workflowCode: [],
				},
			]),
		]);

		expect(html).toContain('model: claude-sonnet');
		expect(html.indexOf('<code>large_tool</code>')).toBeLessThan(
			html.indexOf('<code>small_tool</code>'),
		);
		expect(html).toContain('<table class="usage-table">');
		expect(html).toContain('<th scope="row">input</th><td class="usage-tokens">30,003</td>');
		expect(html).toContain('cache write 30,000');
		expect(html.match(/class="chip chip-cache-break"/g)).toHaveLength(1);
		expect(html).toContain(
			'30,000 of the 30,000 tokens cached by the previous step were not read from cache. Likely cause: more than 5 minutes passed, so the cache expired.',
		);
	});

	it('uses stable anchor ids from file slugs', () => {
		const result = resultWithRunDebug([]);
		expect(getTestCaseAnchorId(result, 0)).toBe('tc-slack-notifier');
	});

	it('labels a replay-seeded case (no authored conversation) without throwing', () => {
		const seedCase: WorkflowTestCase = {
			complexity: 'simple',
			tags: ['seeded'],
			executionScenarios: [{ name: 's', description: 'd', dataSetup: '', successCriteria: 'ok' }],
			datasets: ['seeded'],
			seed: { mode: 'replay' as const, threadId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
		};
		const html = generateRunDebugReport([
			resultWithRunDebug(
				[
					{
						threadId: 'thread-1',
						runId: 'run-1',
						startedAt: 1_700_000_000_000,
						label: 'live turn',
						steps: [],
						workflowCode: [],
					},
				],
				{ testCase: seedCase, fileSlug: undefined },
			),
		]);

		// Falls back to the seeded label instead of crashing on `conversation[0]`.
		expect(html).toContain('[seeded] thread aaaaaaaa');
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
