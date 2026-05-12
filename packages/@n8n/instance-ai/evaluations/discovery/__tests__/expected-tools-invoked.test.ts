import type { AgentActivity, CapturedToolCall, EventOutcome } from '../../types';
import { runExpectedToolsInvokedCheck } from '../expected-tools-invoked';
import type { DiscoveryTestCase } from '../types';

function makeOutcome(opts: {
	toolCalls?: Array<Pick<CapturedToolCall, 'toolName'>>;
	agents?: Array<Pick<AgentActivity, 'role' | 'tools'>>;
}): EventOutcome {
	return {
		workflowIds: [],
		executionIds: [],
		dataTableIds: [],
		finalText: '',
		toolCalls: (opts.toolCalls ?? []).map((tc, i) => ({
			toolCallId: `call-${i}`,
			toolName: tc.toolName,
			args: {},
			durationMs: 0,
		})),
		agentActivities: (opts.agents ?? []).map((a, i) => ({
			agentId: `agent-${i}`,
			role: a.role,
			tools: a.tools,
			toolCalls: [],
			textContent: '',
			reasoning: '',
			status: 'completed',
		})),
	};
}

const slackOauthScenario: DiscoveryTestCase = {
	id: 'test',
	userMessage: 'Help me set up Slack credentials',
	expectedToolInvocations: {
		anyOf: ['browser-credential-setup', 'spawn_sub_agent:browser-credential-setup'],
	},
};

describe('runExpectedToolsInvokedCheck', () => {
	describe('anyOf — positive cases', () => {
		it('passes when the expected top-level tool was invoked', () => {
			const result = runExpectedToolsInvokedCheck(
				slackOauthScenario,
				makeOutcome({ toolCalls: [{ toolName: 'browser-credential-setup' }] }),
			);

			expect(result.pass).toBe(true);
			expect(result.invokedTools).toContain('browser-credential-setup');
		});

		it('passes when the expected sub-agent was spawned (matched via spawn_sub_agent: prefix)', () => {
			const result = runExpectedToolsInvokedCheck(
				slackOauthScenario,
				makeOutcome({
					agents: [{ role: 'browser-credential-setup', tools: ['browser_navigate'] }],
				}),
			);

			expect(result.pass).toBe(true);
			expect(result.spawnedAgents).toContain('spawn_sub_agent:browser-credential-setup');
		});

		it('passes when the spawned sub-agent had the expected tool attached (sub-agent tools list)', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: '',
					expectedToolInvocations: { anyOf: ['browser_navigate'] },
				},
				makeOutcome({
					agents: [{ role: 'browser-credential-setup', tools: ['browser_navigate'] }],
				}),
			);

			expect(result.pass).toBe(true);
			expect(result.invokedTools).toContain('browser_navigate');
		});
	});

	describe('anyOf — negative cases', () => {
		it('fails when none of the expected tools or sub-agents appear', () => {
			const result = runExpectedToolsInvokedCheck(
				slackOauthScenario,
				makeOutcome({ toolCalls: [{ toolName: 'research' }] }),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected at least one of');
			expect(result.comment).toContain('browser-credential-setup');
		});

		it('fails when the orchestrator only ran research with no browser dispatch', () => {
			const result = runExpectedToolsInvokedCheck(
				slackOauthScenario,
				makeOutcome({
					toolCalls: [{ toolName: 'research' }, { toolName: 'ask-user' }],
				}),
			);

			expect(result.pass).toBe(false);
		});
	});

	describe('noneOf — negative scenarios (over-eager invocation guard)', () => {
		const httpNodeConfigScenario: DiscoveryTestCase = {
			id: 'test',
			userMessage: 'How do I set the timeout on my HTTP node?',
			expectedToolInvocations: {
				noneOf: ['browser-credential-setup', 'spawn_sub_agent:browser-credential-setup'],
			},
		};

		it('passes when the forbidden tool was not invoked', () => {
			const result = runExpectedToolsInvokedCheck(
				httpNodeConfigScenario,
				makeOutcome({ toolCalls: [{ toolName: 'nodes' }] }),
			);

			expect(result.pass).toBe(true);
		});

		it('fails when the forbidden tool was invoked', () => {
			const result = runExpectedToolsInvokedCheck(
				httpNodeConfigScenario,
				makeOutcome({ toolCalls: [{ toolName: 'browser-credential-setup' }] }),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected none of');
			expect(result.comment).toContain('browser-credential-setup');
		});

		it('fails when the forbidden sub-agent was spawned', () => {
			const result = runExpectedToolsInvokedCheck(
				httpNodeConfigScenario,
				makeOutcome({
					agents: [{ role: 'browser-credential-setup', tools: ['browser_navigate'] }],
				}),
			);

			expect(result.pass).toBe(false);
		});
	});

	describe('combined anyOf + noneOf', () => {
		const combinedScenario: DiscoveryTestCase = {
			id: 'test',
			userMessage: '',
			expectedToolInvocations: {
				anyOf: ['browser-credential-setup'],
				noneOf: ['delegate'],
			},
		};

		it('passes when anyOf matches and noneOf is not violated', () => {
			const result = runExpectedToolsInvokedCheck(
				combinedScenario,
				makeOutcome({ toolCalls: [{ toolName: 'browser-credential-setup' }] }),
			);

			expect(result.pass).toBe(true);
		});

		it('fails when noneOf is violated even if anyOf matched', () => {
			const result = runExpectedToolsInvokedCheck(
				combinedScenario,
				makeOutcome({
					toolCalls: [{ toolName: 'browser-credential-setup' }, { toolName: 'delegate' }],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected none of');
		});
	});

	describe('rule validation', () => {
		it('throws when neither anyOf nor noneOf is provided', () => {
			expect(() =>
				runExpectedToolsInvokedCheck(
					{ id: 'x', userMessage: '', expectedToolInvocations: {} },
					makeOutcome({}),
				),
			).toThrow(/anyOf.*noneOf/);
		});

		it('throws when both anyOf and noneOf are empty', () => {
			expect(() =>
				runExpectedToolsInvokedCheck(
					{ id: 'x', userMessage: '', expectedToolInvocations: { anyOf: [], noneOf: [] } },
					makeOutcome({}),
				),
			).toThrow();
		});
	});
});
