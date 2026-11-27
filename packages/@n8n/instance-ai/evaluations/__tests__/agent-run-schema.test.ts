import { EvalTestCaseSchema } from '../harness/schema';

// The case contract shared with lang-tracer (AGENT-1665/1666): `agentRun` on the
// case, `userTurns` / `sessions` on each scenario. Only `mode: direct` runs today;
// the rest is pinned now so both repos can build on one shape.

const SEED_AGENT_ID = 'seed-agent-0001';

function directCase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		complexity: 'simple',
		tags: ['agent-runtime'],
		credentials: [{ type: 'anthropicApi' }],
		seed: {
			mode: 'inline',
			agents: [
				{
					id: SEED_AGENT_ID,
					config: {
						name: 'Support',
						model: 'anthropic/claude-sonnet-5-5',
						instructions: 'Answer support questions.',
					},
				},
			],
		},
		agentRun: { mode: 'direct' },
		executionScenarios: [
			{
				name: 'refund',
				description: 'asks for a refund',
				dataSetup: 'The user asks for a refund on order 42.',
				successCriteria: 'The agent explains the refund policy.',
			},
		],
		...overrides,
	};
}

function issueMessages(raw: unknown): string[] {
	const parsed = EvalTestCaseSchema.safeParse(raw);
	return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
}

describe('agentRun case contract', () => {
	it('accepts a direct-mode case with a seeded Agent and no conversation', () => {
		const parsed = EvalTestCaseSchema.parse(directCase());

		expect(parsed.agentRun).toEqual({ mode: 'direct' });
		expect(parsed.conversation).toBeUndefined();
	});

	it('leaves a case without agentRun unchanged', () => {
		const parsed = EvalTestCaseSchema.parse({
			conversation: [{ role: 'user', text: 'build a thing' }],
			complexity: 'simple',
			tags: [],
			outcomeExpectations: ['a workflow exists'],
		});

		expect(parsed.agentRun).toBeUndefined();
	});

	it('accepts the memory fields for later runs', () => {
		const parsed = EvalTestCaseSchema.parse(
			directCase({
				agentRun: {
					mode: 'direct',
					agent: SEED_AGENT_ID,
					keepMemory: true,
					configOverrides: { memory: { observationalMemory: { observerThresholdTokens: 2000 } } },
				},
			}),
		);

		expect(parsed.agentRun).toEqual({
			mode: 'direct',
			agent: SEED_AGENT_ID,
			keepMemory: true,
			configOverrides: { memory: { observationalMemory: { observerThresholdTokens: 2000 } } },
		});
	});

	it('keeps integrations, providerTools and personalisation on a seeded Agent', () => {
		const config = {
			name: 'Support',
			model: 'anthropic/claude-sonnet-5-5',
			instructions: 'Answer support questions.',
			integrations: [{ type: 'n8n_chat' }],
			providerTools: { anthropic: { webSearch: { maxUses: 3 } } },
			personalisation: { icon: 'robot', gradient: { from: '#112233', to: '#445566' } },
		};

		const parsed = EvalTestCaseSchema.parse(
			directCase({ seed: { mode: 'inline', agents: [{ id: SEED_AGENT_ID, config }] } }),
		);

		const seeded = parsed.seed?.mode === 'inline' ? parsed.seed.agents[0].config : undefined;
		expect(seeded?.integrations).toEqual([{ type: 'n8n_chat', credentialId: '' }]);
		expect(seeded?.providerTools).toEqual(config.providerTools);
		expect(seeded?.personalisation).toMatchObject(config.personalisation);
	});

	it('rejects an unknown mode', () => {
		expect(issueMessages(directCase({ agentRun: { mode: 'replay' } }))).not.toEqual([]);
	});

	it('rejects an unknown agentRun key instead of dropping it', () => {
		expect(
			issueMessages(directCase({ agentRun: { mode: 'direct', keepMemroy: true } })),
		).not.toEqual([]);
	});

	it('rejects configOverrides that is not an object', () => {
		expect(
			issueMessages(directCase({ agentRun: { mode: 'direct', configOverrides: 'memory' } })),
		).not.toEqual([]);
	});

	it('rejects a direct-mode case whose seed carries no Agent', () => {
		const messages = issueMessages(
			directCase({
				seed: { mode: 'inline', dataTables: [{ id: 'dt-seed-0001', name: 'Orders', columns: [] }] },
			}),
		);

		expect(messages.some((m) => m.includes('seed.agents'))).toBe(true);
	});

	it('rejects a direct-mode case without a seed', () => {
		const messages = issueMessages(directCase({ seed: undefined }));

		expect(messages.some((m) => m.includes('seed.agents'))).toBe(true);
	});

	it('rejects an agent id the seed does not declare', () => {
		const messages = issueMessages(
			directCase({ agentRun: { mode: 'direct', agent: 'other-agent-1' } }),
		);

		expect(messages.some((m) => m.includes('other-agent-1'))).toBe(true);
	});

	it('requires at least one execution scenario in direct mode', () => {
		const messages = issueMessages(directCase({ executionScenarios: [] }));

		expect(messages.some((m) => m.includes('executionScenario'))).toBe(true);
	});

	it.each([
		['conversation', [{ role: 'user', text: 'hi' }]],
		['processExpectations', ['asks a question']],
		['outcomeExpectations', ['an agent exists']],
		['messageBudget', 3],
		['promptVersion', 'v2'],
		['allowUserExecution', true],
		['requiresMemoryCompaction', true],
		['credentialFixture', 'anthropic'],
	])('rejects the assistant-only field %s in direct mode', (field, value) => {
		const messages = issueMessages(directCase({ [field]: value }));

		expect(messages.some((m) => m.includes(field))).toBe(true);
	});

	it.each([
		['messages', [{ role: 'user', text: 'earlier' }]],
		['projects', [{ name: 'Ops' }]],
	])('rejects seed.%s, which direct mode does not restore', (field, value) => {
		const base = directCase();
		const seed = { ...(base.seed as Record<string, unknown>), [field]: value };

		const messages = issueMessages({ ...base, seed });

		expect(messages.some((m) => m.includes(`seed.${field}`))).toBe(true);
	});
});

describe('scenario userTurns and sessions', () => {
	const scenario = {
		name: 'refund',
		description: 'asks for a refund',
		dataSetup: 'The user asks for a refund on order 42.',
		successCriteria: 'The agent explains the refund policy.',
	};

	it('defaults maxTurns to 6', () => {
		const parsed = EvalTestCaseSchema.parse(
			directCase({ executionScenarios: [{ ...scenario, userTurns: { goal: 'get a refund' } }] }),
		);

		expect(parsed.executionScenarios?.[0].userTurns).toEqual({ goal: 'get a refund', maxTurns: 6 });
	});

	it('accepts sessions, each with its own goal', () => {
		const parsed = EvalTestCaseSchema.parse(
			directCase({
				executionScenarios: [
					{
						...scenario,
						sessions: [{ goal: 'say the order number' }, { goal: 'ask about it', maxTurns: 3 }],
					},
				],
			}),
		);

		expect(parsed.executionScenarios?.[0].sessions).toEqual([
			{ goal: 'say the order number', maxTurns: 6 },
			{ goal: 'ask about it', maxTurns: 3 },
		]);
	});

	it.each([0, 21, 2.5])('rejects maxTurns %s', (maxTurns) => {
		expect(
			issueMessages(
				directCase({ executionScenarios: [{ ...scenario, userTurns: { goal: 'g', maxTurns } }] }),
			),
		).not.toEqual([]);
	});

	it('rejects an empty goal', () => {
		expect(
			issueMessages(directCase({ executionScenarios: [{ ...scenario, userTurns: { goal: '' } }] })),
		).not.toEqual([]);
	});

	it('rejects empty sessions', () => {
		expect(
			issueMessages(directCase({ executionScenarios: [{ ...scenario, sessions: [] }] })),
		).not.toEqual([]);
	});

	it('rejects a scenario with both userTurns and sessions', () => {
		const messages = issueMessages(
			directCase({
				executionScenarios: [{ ...scenario, userTurns: { goal: 'a' }, sessions: [{ goal: 'b' }] }],
			}),
		);

		expect(messages.some((m) => m.includes('userTurns') && m.includes('sessions'))).toBe(true);
	});

	it('rejects userTurns on a case that is not a direct Agent run', () => {
		const messages = issueMessages({
			conversation: [{ role: 'user', text: 'build a thing' }],
			complexity: 'simple',
			tags: [],
			executionScenarios: [{ ...scenario, userTurns: { goal: 'a' } }],
		});

		expect(messages.some((m) => m.includes('agentRun'))).toBe(true);
	});
});
