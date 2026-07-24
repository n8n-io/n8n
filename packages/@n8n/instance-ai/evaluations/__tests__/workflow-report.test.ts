import { generateWorkflowReport } from '../report/workflow-report';
import type { WorkflowTestCase, WorkflowTestCaseResult } from '../types';

const TEST_CASE: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'Build a Slack notifier' }],
	complexity: 'simple',
	tags: [],
	executionScenarios: [{ name: 's', description: 'd', dataSetup: '', successCriteria: 'ok' }],
	datasets: ['full'],
};

function resultWith(
	buildExpectationResults: WorkflowTestCaseResult['buildExpectationResults'],
): WorkflowTestCaseResult {
	return {
		testCase: TEST_CASE,
		workflowBuildSuccess: true,
		executionScenarioResults: [],
		buildExpectationResults,
	};
}

describe('intercepted request rendering', () => {
	it('renders "(no URL)" instead of crashing when a request was captured without a URL', () => {
		const result: WorkflowTestCaseResult = {
			testCase: TEST_CASE,
			workflowBuildSuccess: true,
			executionScenarioResults: [
				{
					scenario: TEST_CASE.executionScenarios![0],
					success: false,
					score: 0,
					reasoning: 'node routing produced an empty request',
					evalResult: {
						executionId: 'e1',
						success: false,
						errors: [],
						hints: {
							globalContext: '',
							triggerContent: {},
							nodeHints: {},
							warnings: [],
							bypassPinData: {},
						},
						mockedCredentials: [],
						nodeResults: {
							'Transcribe Audio': {
								outputs: {},
								outputCount: 0,
								iterationCount: 1,
								executionMode: 'mocked',
								interceptedRequests: [
									{
										// Older captures stored undefined for URL-less requests
										// (broken routing); the report must tolerate it.
										url: undefined as unknown as string,
										method: 'GET',
										nodeType: 'n8n-nodes-base.openAi',
									},
								],
							},
						},
					},
				},
			],
		};

		const html = generateWorkflowReport([result]);

		expect(html).toContain('(no URL)');
		expect(html).not.toContain('GET undefined');
	});
});

describe('build expectations in the workflow report', () => {
	it('renders a section with per-expectation verdicts and reasons', () => {
		const html = generateWorkflowReport([
			resultWith([
				{ expectation: 'asked which channel', pass: true, reason: 'asked in turn 1' },
				{ expectation: 'posts to Slack', pass: false, reason: 'no Slack node' },
			]),
		]);

		expect(html).toContain('Build expectations');
		expect(html).toContain('asked which channel');
		expect(html).toContain('posts to Slack');
		expect(html).toContain('asked in turn 1');
		expect(html).toContain('no Slack node');
		expect(html).toContain('&#10003;'); // pass icon
		expect(html).toContain('&#10007;'); // fail icon
	});

	it('links to the LLM debug report when run debug was captured', () => {
		const html = generateWorkflowReport([
			{
				...resultWith([]),
				fileSlug: 'slack-notifier',
				runDebug: [
					{
						threadId: 'thread-1',
						runId: 'run-1',
						startedAt: 1,
						steps: [],
						workflowCode: [],
					},
				],
			},
		]);

		expect(html).toContain('workflow-eval-llm-debug.html#tc-slack-notifier');
		expect(html).toContain('LLM steps →');
	});

	it('renders an incomplete verdict neutrally and keeps it out of the count', () => {
		const html = generateWorkflowReport([
			resultWith([
				{ expectation: 'posts to Slack', pass: true, reason: 'has Slack node' },
				{
					expectation: 'asked before building',
					pass: false,
					reason: 'no verdict returned',
					incomplete: true,
				},
			]),
		]);

		// 1 graded pass, 0 graded fails, 1 no-verdict — not "1/2" (which would read as a fail).
		expect(html).toContain('1/1 · 1 no verdict');
		expect(html).toContain('⌀'); // neutral no-verdict icon
		expect(html).toContain('expectation n_a');
		expect(html).not.toContain('&#10007;'); // no genuine-fail icon
	});

	it('omits the section entirely when there are no expectation results', () => {
		const html = generateWorkflowReport([resultWith(undefined)]);
		expect(html).not.toContain('Build expectations');
	});
});

describe('transcript rendering', () => {
	it('renders an ordered dialogue with inline tools and elevated user turns', () => {
		const result: WorkflowTestCaseResult = {
			testCase: TEST_CASE,
			workflowBuildSuccess: true,
			executionScenarioResults: [],
			transcript: [
				{
					userMessage: 'Build a Slack notifier',
					steps: [
						{ kind: 'agent-text', text: 'Planning first.' },
						{ kind: 'tool-call', toolName: 'search-nodes' },
						{
							kind: 'confirmation',
							toolName: 'submit-plan',
							resumeReason: 'approval',
							approved: true,
						},
					],
				},
				{ userMessage: 'Actually use #alerts', steps: [{ kind: 'agent-text', text: 'Updated.' }] },
			],
		};
		const html = generateWorkflowReport([result]);
		expect(html).toContain('Planning first.'); // agent narration
		expect(html).toContain('search-nodes'); // inline tool, in order
		expect(html).toContain('👤 approved'); // elevated user decision
		expect(html).toContain('Actually use #alerts'); // follow-up user message
	});

	it('surfaces load_skill skillId inline in the tool-call header', () => {
		const result: WorkflowTestCaseResult = {
			testCase: TEST_CASE,
			workflowBuildSuccess: true,
			executionScenarioResults: [],
			transcript: [
				{
					userMessage: 'Build it',
					steps: [
						{ kind: 'tool-call', toolName: 'load_skill', args: { skillId: 'workflow-builder' } },
					],
				},
			],
		};
		const html = generateWorkflowReport([result]);
		expect(html).toContain('<span class="transcript-inline-arg">workflow-builder</span>');
	});

	it('surfaces a skipped ask-user answer so it is not mistaken for unanswered', () => {
		const result: WorkflowTestCaseResult = {
			testCase: TEST_CASE,
			workflowBuildSuccess: true,
			executionScenarioResults: [],
			transcript: [
				{
					userMessage: 'Build it',
					steps: [
						{
							kind: 'ask-user',
							questions: [{ id: 'q1', question: 'Which channel?', options: ['#a', '#b'] }],
							answers: [{ questionId: 'q1', selectedOptions: [], skipped: true }],
						},
					],
				},
			],
		};
		const html = generateWorkflowReport([result]);
		expect(html).toContain('👤 (skipped)');
		expect(html).toContain('ask-user (with answers)');
	});
});
