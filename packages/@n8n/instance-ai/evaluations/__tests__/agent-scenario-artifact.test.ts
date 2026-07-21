import type { InstanceAiEvalAgentExecutionResult } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { buildAgentVerificationArtifact } from '../harness/runner';

// Structurally an ExecutionScenario; the schema-inferred type is error-typed
// under type-aware lint (deep ZodEffects instantiation — see harness/schema.ts).
const scenario = {
	name: 'announces-release',
	description: 'Happy path announcement',
	dataSetup: 'Slack chat.postMessage succeeds.',
	successCriteria: 'One Slack message announcing v2.31 was posted.',
};

const agentRun: InstanceAiEvalAgentExecutionResult = {
	runId: 'run-1',
	success: true,
	errors: [],
	finalText: 'Posted the announcement to #alerts.',
	model: 'openai/gpt-4o-mini',
	finishReason: 'stop',
	toolCalls: [
		{
			tool: 'Send_Slack_Message',
			kind: 'node',
			input: { channel: 'alerts', message: 'v2.31 shipped!' },
			output: { ok: true },
			mocked: true,
			interceptedRequests: [
				{
					url: 'https://slack.com/api/chat.postMessage',
					method: 'POST',
					nodeType: 'n8n-nodes-base.slackTool',
					requestBody: { channel: 'alerts', text: 'v2.31 shipped!' },
					mockResponse: { ok: true, ts: '1700000000.0001' },
				},
			],
		},
	],
	modelTurns: [
		{ url: 'https://api.openai.com/v1/responses', provider: 'openai', status: 200, streamed: true },
	],
	usage: { inputTokens: 1200, outputTokens: 80 },
	seed: {
		openingMessage: 'Hey, v2.31 shipped — announce it in #alerts please.',
		globalContext: 'Platform team, release v2.31',
		toolHints: { Send_Slack_Message: 'Posting succeeds' },
		warnings: [],
	},
	skippedFeatures: [{ feature: 'memory', reason: 'not mockable yet.' }],
	mockedCredentials: [],
};

describe('buildAgentVerificationArtifact', () => {
	it('renders the agent context as the stable block and the run as the scenario block', () => {
		const artifact = buildAgentVerificationArtifact(scenario, '## Agent config\n{...}', agentRun);

		expect(artifact.workflowContext).toContain('Agent under test');
		expect(artifact.workflowContext).toContain('## Agent config');

		const ctx = artifact.scenarioContext;
		expect(ctx).toContain('announces-release');
		expect(ctx).toContain('Slack chat.postMessage succeeds.');
		expect(ctx).toContain('Hey, v2.31 shipped');
		expect(ctx).toContain('Send_Slack_Message (node)');
		expect(ctx).toContain('https://slack.com/api/chat.postMessage');
		expect(ctx).toContain('1700000000.0001');
		expect(ctx).toContain('Posted the announcement to #alerts.');
		expect(ctx).toContain('HARNESS LIMITATION: agent feature "memory"');
	});

	it('flags errored tool calls and mock-generation failures', () => {
		const failedRun: InstanceAiEvalAgentExecutionResult = {
			...agentRun,
			success: false,
			finishReason: 'error',
			errors: ['Model run error: rate limited'],
			finalText: '',
			toolCalls: [
				{
					tool: 'Send_Slack_Message',
					kind: 'node',
					error: 'Tool call failed (not reported in the run result — see interceptedRequests)',
					mocked: true,
					interceptedRequests: [
						{
							url: 'https://slack.com/api/chat.postMessage',
							method: 'POST',
							nodeType: 'n8n-nodes-base.slackTool',
							mockResponse: { _evalMockError: true, message: 'mock generation timed out' },
						},
					],
				},
			],
		};

		const ctx = buildAgentVerificationArtifact(scenario, '(config)', failedRun).scenarioContext;
		expect(ctx).toContain('FAILED');
		expect(ctx).toContain('Model run error: rate limited');
		expect(ctx).toContain('ERRORED');
		expect(ctx).toContain('MOCK ISSUE: tool "Send_Slack_Message"');
		expect(ctx).toContain('(no final text)');
	});
});
