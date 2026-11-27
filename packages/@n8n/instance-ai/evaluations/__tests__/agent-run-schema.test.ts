import { agentExpectationUnits } from '../harness/agent-run-schema';
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
				expectations: ['Quotes the 14-day refund window'],
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

	const memoryConfig = {
		name: 'Support',
		model: 'anthropic/claude-sonnet-5-5',
		instructions: 'Answer support questions.',
		memory: { enabled: true, storage: 'n8n', observationalMemory: { enabled: true } },
	};
	const memorySeed = { mode: 'inline', agents: [{ id: SEED_AGENT_ID, config: memoryConfig }] };

	it('accepts the memory fields', () => {
		const parsed = EvalTestCaseSchema.parse(
			directCase({
				seed: memorySeed,
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

	it('rejects configOverrides that make the seeded Agent config invalid', () => {
		const messages = issueMessages(
			directCase({
				seed: memorySeed,
				agentRun: {
					mode: 'direct',
					configOverrides: { memory: { observationalMemory: { observerThresholdTokens: -1 } } },
				},
			}),
		);

		expect(messages).toEqual([expect.stringContaining('observerThresholdTokens')]);
	});

	it('rejects a configOverrides key the Agent config does not have', () => {
		const messages = issueMessages(
			directCase({
				seed: memorySeed,
				agentRun: { mode: 'direct', configOverrides: { memory: { observerModel: 'x' } } },
			}),
		);

		expect(messages).toEqual([expect.stringContaining('memory.observerModel')]);
	});

	it('rejects configOverrides that set a credential: memory credentials come from the seed', () => {
		const messages = issueMessages(
			directCase({
				seed: memorySeed,
				agentRun: {
					mode: 'direct',
					keepMemory: true,
					configOverrides: { memory: { episodicMemory: { enabled: true, credential: 'cred-9' } } },
				},
			}),
		);

		expect(messages).toEqual([expect.stringContaining('memory.episodicMemory.credential')]);
	});

	it('rejects configOverrides that set a worker model: models go through the resolver at restore', () => {
		const messages = issueMessages(
			directCase({
				seed: memorySeed,
				agentRun: {
					mode: 'direct',
					keepMemory: true,
					configOverrides: {
						memory: { observationalMemory: { observerModel: { model: 'openai/gpt-5' } } },
					},
				},
			}),
		);

		expect(messages).toEqual([expect.stringContaining('memory.observationalMemory.observerModel')]);
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
		['allowUserExecution', false],
		['requiresMemoryCompaction', false],
	])('treats %s: false as absent in direct mode', (field, value) => {
		expect(issueMessages(directCase({ [field]: value }))).toEqual([]);
	});

	describe('a scenario table named like a seed table', () => {
		const seedTable = {
			id: 'dt-price-list-0001',
			name: 'price_list',
			columns: [{ name: 'sku', type: 'string' }],
		};
		const withScenarioTable = (columns: unknown[]) => {
			const base = directCase();
			const seed = base.seed as Record<string, unknown>;
			const [scenario] = base.executionScenarios as Array<Record<string, unknown>>;
			return {
				...base,
				seed: { ...seed, dataTables: [seedTable] },
				executionScenarios: [
					{ ...scenario, seedDataTables: [{ ...seedTable, columns, rows: [] }] },
				],
			};
		};

		it('is accepted with the same columns', () => {
			expect(issueMessages(withScenarioTable(seedTable.columns))).toEqual([]);
		});

		it('is rejected with different columns', () => {
			const messages = issueMessages(withScenarioTable([{ name: 'price', type: 'number' }]));

			expect(messages.some((m) => m.includes('price_list') && m.includes('columns'))).toBe(true);
		});
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
		expectations: ['Quotes the 14-day refund window'],
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

describe('scenario expectations', () => {
	const base = {
		name: 'refund',
		description: 'asks for a refund',
		dataSetup: 'The user asks for a refund on order 42.',
	};

	it('accepts a direct-mode scenario graded by expectations alone', () => {
		const parsed = EvalTestCaseSchema.parse(
			directCase({
				executionScenarios: [{ ...base, expectations: ['Quotes the refund window'] }],
			}),
		);

		expect(parsed.executionScenarios?.[0].expectations).toEqual(['Quotes the refund window']);
		expect(parsed.executionScenarios?.[0].successCriteria).toBe('');
	});

	it('accepts expectations that live only on a session', () => {
		const parsed = EvalTestCaseSchema.parse(
			directCase({
				executionScenarios: [
					{
						...base,
						sessions: [
							{ goal: 'give the order' },
							{ goal: 'ask again', expectations: ['Recalls it'] },
						],
					},
				],
			}),
		);

		expect(parsed.executionScenarios?.[0].sessions?.[1].expectations).toEqual(['Recalls it']);
	});

	it('rejects a direct-mode scenario with no expectation anywhere', () => {
		const messages = issueMessages(
			directCase({ executionScenarios: [{ ...base, successCriteria: 'Explains the policy' }] }),
		);

		expect(messages.some((m) => m.includes('expectation'))).toBe(true);
	});

	it('rejects an empty expectation', () => {
		expect(
			issueMessages(directCase({ executionScenarios: [{ ...base, expectations: [''] }] })),
		).not.toEqual([]);
	});

	it('still requires successCriteria on an assistant case', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			conversation: [{ role: 'user', text: 'build a thing' }],
			complexity: 'simple',
			tags: [],
			executionScenarios: [base],
		});

		expect(parsed.success).toBe(false);
		expect(parsed.error?.issues.map((issue) => issue.path.join('.'))).toContain(
			'executionScenarios.0.successCriteria',
		);
	});

	it('rejects expectations on a case that is not a direct Agent run', () => {
		const messages = issueMessages({
			conversation: [{ role: 'user', text: 'build a thing' }],
			complexity: 'simple',
			tags: [],
			executionScenarios: [{ ...base, successCriteria: 'works', expectations: ['a'] }],
		});

		expect(messages.some((m) => m.includes('agentRun'))).toBe(true);
	});
});

describe('duplicate expectations', () => {
	const scenario = (extra: Record<string, unknown>) => ({
		name: 'refund',
		description: 'asks for a refund',
		dataSetup: 'The user asks for a refund on order 42.',
		...extra,
	});

	it('are refused within a scenario, since both would be one unit', () => {
		const messages = issueMessages(
			directCase({
				executionScenarios: [
					scenario({ expectations: ['Quotes the window', 'Quotes the window'] }),
				],
			}),
		);

		expect(messages).toEqual([expect.stringContaining('"Quotes the window" is listed twice')]);
	});

	it('are refused within a session', () => {
		const messages = issueMessages(
			directCase({
				executionScenarios: [
					scenario({
						sessions: [{ goal: 'g', expectations: ['Recalls the order', 'Recalls the order'] }],
					}),
				],
			}),
		);

		expect(messages).toEqual([expect.stringContaining('"Recalls the order" is listed twice')]);
	});

	it('are allowed across a scenario and its sessions, which key them apart', () => {
		const messages = issueMessages(
			directCase({
				executionScenarios: [
					scenario({
						expectations: ['Is polite'],
						sessions: [
							{ goal: 'g', expectations: ['Is polite'] },
							{ goal: 'g', expectations: ['Is polite'] },
						],
					}),
				],
			}),
		);

		expect(messages).toEqual([]);
	});
});

describe('agentExpectationUnits', () => {
	it('keys each expectation by its scenario, and a session expectation by its session too', () => {
		const units = agentExpectationUnits({
			name: 'refund',
			expectations: ['Greets the user'],
			sessions: [
				{ goal: 'g', maxTurns: 6 },
				{ goal: 'g', maxTurns: 6, expectations: ['Recalls the order'] },
			],
		});

		expect(units).toEqual([
			{ key: 'refund › Greets the user', text: 'Greets the user' },
			{ key: 'refund › session 2 › Recalls the order', text: 'In session 2: Recalls the order' },
		]);
	});

	it('has no units for a scenario without expectations', () => {
		expect(agentExpectationUnits({ name: 'refund', successCriteria: 'ok' })).toEqual([]);
	});
});

describe('expectation keys stay unambiguous', () => {
	const scenario = (name: string, expectations: string[], sessions?: unknown[]) => ({
		name,
		description: 'd',
		dataSetup: 'x',
		expectations,
		...(sessions ? { sessions } : {}),
	});

	it('rejects the key separator " › " in a scenario name', () => {
		expect(
			issueMessages(directCase({ executionScenarios: [scenario('refund › late', ['Quotes it'])] })),
		).toEqual([expect.stringContaining('" › "')]);
	});

	it('rejects the key separator in a scenario expectation and in a session expectation', () => {
		const messages = issueMessages(
			directCase({
				executionScenarios: [
					scenario(
						'refund',
						['Quotes › the window'],
						[{ goal: 'g', expectations: ['Recalls › the order'] }],
					),
				],
			}),
		);

		expect(messages).toHaveLength(2);
		expect(messages.every((message) => message.includes('" › "'))).toBe(true);
	});

	it('accepts the character without the spaces around it', () => {
		expect(
			issueMessages(directCase({ executionScenarios: [scenario('refund›late', ['Quotes it'])] })),
		).toEqual([]);
	});

	it('rejects two scenarios with the same name', () => {
		const messages = issueMessages(
			directCase({
				executionScenarios: [scenario('refund', ['Quotes it']), scenario('refund', ['Says no'])],
			}),
		);

		expect(messages).toEqual([expect.stringContaining('"refund"')]);
	});
});
