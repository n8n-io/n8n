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
});
