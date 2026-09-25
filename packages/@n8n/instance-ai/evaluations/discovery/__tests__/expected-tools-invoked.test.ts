import type { AgentActivity, CapturedToolCall, EventOutcome } from '../../types';
import { evaluateDiscoveryTrial, runExpectedToolsInvokedCheck } from '../expected-tools-invoked';
import type { DiscoveryTestCase, DiscoveryTrialFacts } from '../types';

type ToolCallInput = Pick<CapturedToolCall, 'toolName'> &
	Partial<Pick<CapturedToolCall, 'args' | 'result'>>;

function makeToolCall(tc: ToolCallInput, i: number): CapturedToolCall {
	return {
		toolCallId: `call-${i}`,
		toolName: tc.toolName,
		args: tc.args ?? {},
		...(tc.result === undefined ? {} : { result: tc.result }),
		durationMs: 0,
	};
}

function makeOutcome(opts: {
	toolCalls?: ToolCallInput[];
	agents?: Array<Pick<AgentActivity, 'role' | 'tools'> & { toolCalls?: ToolCallInput[] }>;
}): EventOutcome {
	return {
		workflowIds: [],
		executionIds: [],
		dataTableIds: [],
		artifactRefs: [],
		finalText: '',
		toolCalls: (opts.toolCalls ?? []).map(makeToolCall),
		agentActivities: (opts.agents ?? []).map((a, i) => ({
			agentId: `agent-${i}`,
			role: a.role,
			tools: a.tools,
			toolCalls: (a.toolCalls ?? []).map(makeToolCall),
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
		anyOf: ['load_skill', 'browser_navigate'],
	},
};

describe('runExpectedToolsInvokedCheck', () => {
	describe('anyOf — positive cases', () => {
		it('passes when the expected top-level tool was invoked', () => {
			const result = runExpectedToolsInvokedCheck(
				slackOauthScenario,
				makeOutcome({ toolCalls: [{ toolName: 'load_skill' }] }),
			);

			expect(result.pass).toBe(true);
			expect(result.invokedTools).toContain('load_skill');
		});

		it('passes when a named sub-agent was spawned (matched via spawn_sub_agent: prefix)', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: '',
					expectedToolInvocations: { anyOf: ['spawn_sub_agent:researcher'] },
				},
				makeOutcome({
					agents: [{ role: 'researcher', tools: ['credentials'] }],
				}),
			);

			expect(result.pass).toBe(true);
			expect(result.spawnedAgents).toContain('spawn_sub_agent:researcher');
		});

		it('passes when the spawned sub-agent had the expected tool attached (sub-agent tools list)', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: '',
					expectedToolInvocations: { anyOf: ['credentials'] },
				},
				makeOutcome({
					agents: [{ role: 'researcher', tools: ['credentials'] }],
				}),
			);

			expect(result.pass).toBe(true);
			expect(result.invokedTools).toContain('credentials');
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
			expect(result.comment).toContain('browser_navigate');
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
				noneOf: ['browser_navigate', 'spawn_sub_agent:credential-helper'],
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
				makeOutcome({ toolCalls: [{ toolName: 'browser_navigate' }] }),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected none of');
			expect(result.comment).toContain('browser_navigate');
		});

		it('fails when the forbidden sub-agent was spawned', () => {
			const result = runExpectedToolsInvokedCheck(
				httpNodeConfigScenario,
				makeOutcome({
					agents: [{ role: 'credential-helper', tools: ['browser_navigate'] }],
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
				anyOf: ['browser_navigate'],
				noneOf: ['delegate'],
			},
		};

		it('passes when anyOf matches and noneOf is not violated', () => {
			const result = runExpectedToolsInvokedCheck(
				combinedScenario,
				makeOutcome({ toolCalls: [{ toolName: 'browser_navigate' }] }),
			);

			expect(result.pass).toBe(true);
		});

		it('fails when noneOf is violated even if anyOf matched', () => {
			const result = runExpectedToolsInvokedCheck(
				combinedScenario,
				makeOutcome({
					toolCalls: [{ toolName: 'browser_navigate' }, { toolName: 'delegate' }],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected none of');
		});
	});

	describe('noneOfToolCalls — actual tool-call guard', () => {
		const planningScenario: DiscoveryTestCase = {
			id: 'test',
			userMessage: 'Build a Gmail and Calendar workflow',
			expectedToolInvocations: {
				anyOf: ['create-tasks'],
				noneOfToolCalls: [{ toolName: 'ask-user', argsContainAny: ['credential'] }],
			},
		};

		it('passes when ask-user is available to a spawned agent but is not called', () => {
			const result = runExpectedToolsInvokedCheck(
				planningScenario,
				makeOutcome({
					toolCalls: [{ toolName: 'create-tasks' }],
					agents: [{ role: 'delegate', tools: ['credentials', 'ask-user'] }],
				}),
			);

			expect(result.pass).toBe(true);
			expect(result.invokedTools).toContain('ask-user');
		});

		it('fails when the forbidden tool call happens with matching args', () => {
			const result = runExpectedToolsInvokedCheck(
				planningScenario,
				makeOutcome({
					toolCalls: [
						{ toolName: 'create-tasks' },
						{
							toolName: 'ask-user',
							args: { question: 'Which Google Calendar credential should I use?' },
						},
					],
					agents: [{ role: 'delegate', tools: ['credentials', 'ask-user'] }],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected no actual tool call matching');
			expect(result.comment).toContain('credential');
		});

		it('passes when the same tool is called for unrelated args', () => {
			const result = runExpectedToolsInvokedCheck(
				planningScenario,
				makeOutcome({
					toolCalls: [
						{ toolName: 'create-tasks' },
						{ toolName: 'ask-user', args: { question: 'Which failure branch should run?' } },
					],
					agents: [{ role: 'delegate', tools: ['credentials', 'ask-user'] }],
				}),
			);

			expect(result.pass).toBe(true);
		});
	});

	describe('anyOfToolCalls — actual tool-call alternatives', () => {
		const credentialSetupScenario: DiscoveryTestCase = {
			id: 'test',
			userMessage: 'Help me set up Slack credentials',
			expectedToolInvocations: {
				anyOfToolCalls: [
					{ toolName: 'load_skill', argsContainAny: ['credential-setup-with-computer-use'] },
					{ toolName: 'browser_navigate' },
				],
			},
		};

		it('passes when one expected actual tool call happened with matching args', () => {
			const result = runExpectedToolsInvokedCheck(
				credentialSetupScenario,
				makeOutcome({
					toolCalls: [
						{
							toolName: 'load_skill',
							args: { skillId: 'credential-setup-with-computer-use' },
						},
					],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('passes when a browser fallback tool call happened', () => {
			const result = runExpectedToolsInvokedCheck(
				credentialSetupScenario,
				makeOutcome({ toolCalls: [{ toolName: 'browser_navigate' }] }),
			);

			expect(result.pass).toBe(true);
		});

		it('fails when only an unrelated skill was loaded', () => {
			const result = runExpectedToolsInvokedCheck(
				credentialSetupScenario,
				makeOutcome({ toolCalls: [{ toolName: 'load_skill', args: { skillId: 'other-skill' } }] }),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('credential-setup-with-computer-use');
		});
	});

	describe('allOfToolCalls — actual tool-call requirements', () => {
		const dataTableScenario: DiscoveryTestCase = {
			id: 'test',
			userMessage: 'List my n8n Data Tables.',
			expectedToolInvocations: {
				allOfToolCalls: [
					{ toolName: 'load_skill', argsContainAny: ['data-table-manager'] },
					{ toolName: 'data-tables', argsContainAny: ['list'] },
				],
			},
		};

		it('passes when every expected actual tool call happened with matching args', () => {
			const result = runExpectedToolsInvokedCheck(
				dataTableScenario,
				makeOutcome({
					toolCalls: [
						{ toolName: 'load_skill', args: { skillId: 'data-table-manager' } },
						{ toolName: 'data-tables', args: { action: 'list' } },
					],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('fails when a tool is only available to a spawned agent but was not called', () => {
			const result = runExpectedToolsInvokedCheck(
				dataTableScenario,
				makeOutcome({
					toolCalls: [{ toolName: 'load_skill', args: { skillId: 'data-table-manager' } }],
					agents: [{ role: 'workflow-builder', tools: ['data-tables'] }],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Expected actual tool call matching');
			expect(result.comment).toContain('data-tables');
		});

		it('fails when the tool call args do not match the expectation', () => {
			const result = runExpectedToolsInvokedCheck(
				dataTableScenario,
				makeOutcome({
					toolCalls: [
						{ toolName: 'load_skill', args: { skillId: 'data-table-manager' } },
						{ toolName: 'data-tables', args: { action: 'schema' } },
					],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('list');
		});
	});

	describe('args — structured argument matching', () => {
		const connectNotion: DiscoveryTestCase = {
			id: 'test',
			userMessage: 'Search my Notion.',
			expectedToolInvocations: {
				anyOfToolCalls: [
					{ toolName: 'mcp-servers', args: { action: 'connect', serverSlugs: ['notion'] } },
				],
			},
		};

		it('passes on a deep-partial match, ignoring unlisted keys', () => {
			const result = runExpectedToolsInvokedCheck(
				connectNotion,
				makeOutcome({
					toolCalls: [
						{
							toolName: 'mcp-servers',
							args: { action: 'connect', serverSlugs: ['notion'], reason: 'unlocks search' },
						},
					],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('matches an array as a subset, not by length or order', () => {
			const result = runExpectedToolsInvokedCheck(
				connectNotion,
				makeOutcome({
					toolCalls: [
						{
							toolName: 'mcp-servers',
							args: { action: 'connect', serverSlugs: ['linear', 'notion'] },
						},
					],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('fails when a listed key differs, even though a substring match would pass', () => {
			const result = runExpectedToolsInvokedCheck(
				connectNotion,
				makeOutcome({
					toolCalls: [
						{
							toolName: 'mcp-servers',
							args: {
								action: 'connect',
								serverSlugs: ['linear'],
								reason: 'Linear covers this instead of Notion',
							},
						},
					],
				}),
			);

			expect(result.pass).toBe(false);
		});

		it('fails when the action differs', () => {
			const result = runExpectedToolsInvokedCheck(
				connectNotion,
				makeOutcome({
					toolCalls: [{ toolName: 'mcp-servers', args: { action: 'search', queries: ['notion'] } }],
				}),
			);

			expect(result.pass).toBe(false);
		});
	});

	describe('declined tool calls', () => {
		const declined = {
			declined: true,
			message: 'Tool "mcp_notion_notion-search" was not approved',
		};

		it('does not count a declined call as a violation', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: {
						noneOfToolCalls: [{ toolName: 'mcp_notion_notion-search' }],
					},
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: declined }],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('does not count a declined call as satisfying a positive expectation', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: {
						anyOfToolCalls: [{ toolName: 'mcp_notion_notion-search' }],
					},
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: declined }],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('declined');
		});

		it('still counts a call that was approved and ran', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: {
						anyOfToolCalls: [{ toolName: 'mcp_notion_notion-search' }],
					},
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: { ok: true } }],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('matches a refusal when the expectation asks for one', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: {
						allOfToolCalls: [{ toolName: 'mcp_notion_notion-search', declined: true }],
					},
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: declined }],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('does not match a call that ran when the expectation asks for a refusal', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: {
						allOfToolCalls: [{ toolName: 'mcp_notion_notion-search', declined: true }],
					},
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: { ok: true } }],
				}),
			);

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('a declined result');
		});

		it('does not count a sub-agent call the user refused as invoked', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: { noneOf: ['mcp_notion_notion-search'] },
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: declined }],
					agents: [
						{
							role: 'researcher',
							tools: [],
							toolCalls: [{ toolName: 'mcp_notion_notion-search', result: declined }],
						},
					],
				}),
			);

			expect(result.pass).toBe(true);
			expect(result.invokedTools).not.toContain('mcp_notion_notion-search');
		});

		it('counts a sub-agent call that ran as invoked', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: { anyOf: ['mcp_notion_notion-search'] },
				},
				makeOutcome({
					agents: [
						{
							role: 'researcher',
							tools: [],
							toolCalls: [{ toolName: 'mcp_notion_notion-search', result: { ok: true } }],
						},
					],
				}),
			);

			expect(result.pass).toBe(true);
		});

		it('forbids a refusal when noneOfToolCalls asks for one', () => {
			const result = runExpectedToolsInvokedCheck(
				{
					id: 'test',
					userMessage: 'Search my Notion.',
					expectedToolInvocations: {
						noneOfToolCalls: [{ toolName: 'mcp_notion_notion-search', declined: true }],
					},
				},
				makeOutcome({
					toolCalls: [{ toolName: 'mcp_notion_notion-search', result: declined }],
				}),
			);

			expect(result.pass).toBe(false);
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

describe('evaluateDiscoveryTrial', () => {
	const trial = (overrides: Partial<DiscoveryTrialFacts> = {}): DiscoveryTrialFacts => ({
		streamStatus: 'completed',
		timeoutMs: 60_000,
		unmatchedConfirmations: [],
		...overrides,
	});

	const negativeOnly: DiscoveryTestCase = {
		id: 'test',
		userMessage: 'Set up a Slack credential.',
		expectedToolInvocations: { noneOf: ['browser_navigate'] },
	};

	const positiveOnly: DiscoveryTestCase = {
		id: 'test',
		userMessage: 'Screenshot my dashboard.',
		expectedToolInvocations: { anyOf: ['browser_navigate'] },
	};

	const satisfied = makeOutcome({ toolCalls: [{ toolName: 'browser_navigate' }] });

	it('passes a satisfied expectation on a completed run', () => {
		expect(evaluateDiscoveryTrial(negativeOnly, makeOutcome({}), trial()).pass).toBe(true);
		expect(evaluateDiscoveryTrial(positiveOnly, satisfied, trial()).pass).toBe(true);
	});

	it.each([
		['negative-only', negativeOnly, makeOutcome({})],
		['positive-only', positiveOnly, satisfied],
	])('fails a satisfied %s expectation when the run stopped at its step cap', (_l, s, outcome) => {
		const result = evaluateDiscoveryTrial(s, outcome, trial({ streamStatus: 'step-exhausted' }));

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('step cap');
	});

	it.each(['errored', 'suspended'] as const)(
		'fails a satisfied expectation when the run %s',
		(streamStatus) => {
			const result = evaluateDiscoveryTrial(positiveOnly, satisfied, trial({ streamStatus }));

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('Run did not complete');
		},
	);

	it('fails a satisfied expectation when the run exceeded its budget', () => {
		const result = evaluateDiscoveryTrial(
			positiveOnly,
			satisfied,
			trial({ streamStatus: 'timed-out', timeoutMs: 150_000 }),
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('exceeded its 150000ms budget');
	});

	it('reports the run error alongside the invalid trial', () => {
		const result = evaluateDiscoveryTrial(
			negativeOnly,
			makeOutcome({}),
			trial({ streamStatus: 'errored', runError: 'overloaded_error' }),
		);

		expect(result.comment).toContain('errored: overloaded_error');
	});

	it('keeps the expectation diagnostic when an invalid trial also failed its expectation', () => {
		const result = evaluateDiscoveryTrial(
			positiveOnly,
			makeOutcome({ toolCalls: [{ toolName: 'nodes' }] }),
			trial({ streamStatus: 'timed-out' }),
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('budget and was abandoned');
		expect(result.comment).toContain('Expected at least one of');
	});

	it('fails when a declared confirmation answer was never asked for', () => {
		const result = evaluateDiscoveryTrial(
			negativeOnly,
			makeOutcome({}),
			trial({ unmatchedConfirmations: ['mcp_notion_notion-search'] }),
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('mcp_notion_notion-search');
		expect(result.comment).toContain('never ran');
	});
});
