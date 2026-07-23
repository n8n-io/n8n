import type { InstanceAiEvalAgentExecutionResult } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { generateWorkflowReport } from '../report/workflow-report';
import { parseTargetOutput } from '../run/reshape';
import type { WorkflowTestCase, WorkflowTestCaseResult } from '../types';

const agentRun: InstanceAiEvalAgentExecutionResult = {
	runId: 'run-1',
	success: true,
	errors: [],
	finalText: 'Commented on existing issue #482.',
	model: 'openai/gpt-4o-mini',
	finishReason: 'stop',
	toolCalls: [
		{
			tool: 'github_comment_on_issue',
			kind: 'node',
			input: { issueNumber: 482, body: 'Duplicate report' },
			output: { ok: true },
			mocked: true,
			interceptedRequests: [
				{
					url: 'https://api.github.com/repos/acme/widgets/issues/482/comments',
					method: 'POST',
					nodeType: 'n8n-nodes-base.githubTool',
					requestBody: { body: 'Duplicate report' },
					mockResponse: { id: 9001 },
				},
			],
		},
	],
	modelTurns: [
		{
			url: 'https://api.openai.com/v1/responses',
			provider: 'openai',
			status: 200,
			durationMs: 3400,
			streamed: true,
			responseBody: 'data: {"type":"response.completed"}',
		},
	],
	usage: { inputTokens: 1200, outputTokens: 90 },
	seed: {
		openingMessage: 'A user reports CSV export truncates rows over 10k.',
		globalContext: 'Repo acme/widgets, open issue 482',
		toolHints: { github_comment_on_issue: 'Comment posts succeed' },
		warnings: [],
	},
	skippedFeatures: [{ feature: 'memory', reason: 'not mockable yet.' }],
	mockedCredentials: [],
};

const testCase = {
	description: 'Agent triage case',
	conversation: [{ role: 'user', text: 'Create an agent...' }],
	complexity: 'medium',
	tags: ['agent'],
	executionScenarios: [
		{
			name: 'comments-on-duplicate',
			description: 'Duplicate exists',
			dataSetup: 'Search returns issue 482.',
			successCriteria: 'Commented on 482, no new issue.',
		},
	],
} as unknown as WorkflowTestCase;

describe('agent run rendering in the HTML report', () => {
	it('renders the built agent and the agent scenario trace', () => {
		const result: WorkflowTestCaseResult = {
			testCase,
			fileSlug: 'agent-github-triage',
			workflowBuildSuccess: true,
			agentId: 'agent-1',
			agentArtifactContext: '## Agent config\n{"name":"Bug Triage"}',
			executionScenarioResults: [
				{
					scenario: testCase.executionScenarios![0],
					success: true,
					agentEvalResult: agentRun,
					agentId: 'agent-1',
					score: 1,
					reasoning: 'The agent commented on issue 482 and created nothing.',
				},
			],
		};

		const html = generateWorkflowReport([result]);

		expect(html).toContain('Built agent (agent-1)');
		expect(html).toContain('Bug Triage');
		expect(html).toContain('Scenario seed');
		expect(html).toContain('A user reports CSV export truncates rows over 10k.');
		expect(html).toContain('github_comment_on_issue');
		expect(html).toContain('https://api.github.com/repos/acme/widgets/issues/482/comments');
		expect(html).toContain('Mock returned');
		expect(html).toContain('Model turns (real, recorded)');
		expect(html).toContain('Commented on existing issue #482.');
		expect(html).toContain('Agent features disabled for this run');
	});
});

describe('agent fields in LangSmith run outputs', () => {
	it('round-trips agentEvalResult, agentId, and agentContext', () => {
		const output = parseTargetOutput({
			buildSuccess: true,
			passed: true,
			score: 1,
			reasoning: 'ok',
			agentId: 'agent-1',
			agentContext: '## Agent config',
			agentEvalResult: agentRun,
			execDurationMs: 100,
			nodeCount: 0,
		});

		expect(output?.agentId).toBe('agent-1');
		expect(output?.agentContext).toBe('## Agent config');
		expect(output?.agentEvalResult?.toolCalls[0].tool).toBe('github_comment_on_issue');
	});

	it('drops a malformed agentEvalResult instead of crashing the row', () => {
		const output = parseTargetOutput({
			buildSuccess: true,
			passed: true,
			score: 1,
			reasoning: 'ok',
			agentEvalResult: { nope: true },
			execDurationMs: 100,
			nodeCount: 0,
		});

		expect(output).toBeDefined();
		expect(output?.agentEvalResult).toBeUndefined();
	});
});
