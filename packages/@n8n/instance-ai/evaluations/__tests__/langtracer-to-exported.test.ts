import { EvalTestCaseSchema, type EvalTestCaseInput } from '../harness/schema';
import { normalizeExportedCase } from '../langtracer/normalize';
import { diskCaseToLangTracerCreate, unsupportedPushReason } from '../langtracer/to-exported';

/** A minimal schema-parsed disk case (conversation text already collapsed to a string). */
function diskCase(overrides: Partial<EvalTestCaseInput> = {}): EvalTestCaseInput {
	return {
		conversation: [{ role: 'user', text: 'build a thing' }],
		complexity: 'simple',
		tags: ['build'],
		datasets: ['full'],
		...overrides,
	} as EvalTestCaseInput;
}

describe('diskCaseToLangTracerCreate', () => {
	it('renames disk keys to the lang-tracer create-case keys', () => {
		const body = diskCaseToLangTracerCreate(
			diskCase({
				complexity: 'complex',
				tags: ['build', 'form'],
				triggerType: 'form',
				executionScenarios: [
					{ name: 'happy', description: 'd', dataSetup: 's', successCriteria: 'ok' },
				],
			}),
			'my-slug',
			{ suiteId: 7, setKind: 'regression', synthetic: true },
		);

		expect(body.name).toBe('my-slug');
		expect(body.suiteId).toBe(7);
		expect(body.setKind).toBe('regression');
		expect(body.synthetic).toBe(true);
		expect(body.evalComplexity).toBe('complex');
		expect(body.evalTags).toEqual(['build', 'form']);
		expect(body.evalTriggerType).toBe('form');
		expect(body.scenarios).toEqual([
			{ name: 'happy', description: 'd', dataSetup: 's', successCriteria: 'ok' },
		]);
		// disk key names must not leak into the payload
		expect('complexity' in body).toBe(false);
		expect('tags' in body).toBe(false);
		expect('triggerType' in body).toBe(false);
		expect('executionScenarios' in body).toBe(false);
	});

	it('passes through description, conversation and expectation/metadata fields', () => {
		const body = diskCaseToLangTracerCreate(
			diskCase({
				description: 'why this case exists',
				conversation: [{ role: 'user', text: 'hi' }],
				processExpectations: ['asks a clarifying question'],
				outcomeExpectations: ['has a trigger'],
				datasets: ['pr', 'full'],
				messageBudget: 4,
				credentials: [{ type: 'slackApi', name: 'Slack' }],
			}),
			'c',
			{ suiteId: 1, setKind: 'regression', synthetic: true },
		);

		expect(body.description).toBe('why this case exists');
		expect(body.conversation).toEqual([{ role: 'user', text: 'hi' }]);
		expect(body.processExpectations).toEqual(['asks a clarifying question']);
		expect(body.outcomeExpectations).toEqual(['has a trigger']);
		expect(body.datasets).toEqual(['pr', 'full']);
		expect(body.messageBudget).toBe(4);
		expect(body.credentials).toEqual([{ type: 'slackApi', name: 'Slack' }]);
	});

	it('omits optional keys that are absent on the disk case', () => {
		const body = diskCaseToLangTracerCreate(diskCase(), 'c', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});

		expect('scenarios' in body).toBe(false);
		expect('processExpectations' in body).toBe(false);
		expect('outcomeExpectations' in body).toBe(false);
		expect('messageBudget' in body).toBe(false);
		expect('credentials' in body).toBe(false);
		expect('evalTriggerType' in body).toBe(false);
		expect('description' in body).toBe(false);
	});

	it('forwards typed scenario seed tables so lang-tracer stores their rows', () => {
		const seedDataTables = [
			{
				id: 'mcv2CustomersTbl0001',
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' as const }],
				rows: [{ email: 'dana@harbor.example' }],
			},
		];
		const body = diskCaseToLangTracerCreate(
			diskCase({
				executionScenarios: [
					{
						name: 'seeded',
						description: 'd',
						dataSetup: 's',
						successCriteria: 'ok',
						seedDataTables,
					},
					{ name: 'plain', description: 'd', dataSetup: 's', successCriteria: 'ok' },
				],
			}),
			'c',
			{ suiteId: 1, setKind: 'regression', synthetic: true },
		);

		expect(body.scenarios?.[0].seedDataTables).toEqual(seedDataTables);
		expect('seedDataTables' in (body.scenarios?.[1] ?? {})).toBe(false);
	});

	it('preserves a scenario `requires` field when present', () => {
		const body = diskCaseToLangTracerCreate(
			diskCase({
				executionScenarios: [
					{
						name: 'err',
						description: 'd',
						dataSetup: 's',
						successCriteria: 'ok',
						requires: 'mock-server',
					},
				],
			}),
			'c',
			{ suiteId: 1, setKind: 'regression', synthetic: true },
		);

		expect(body.scenarios?.[0].requires).toBe('mock-server');
	});
});

describe('unsupportedPushReason', () => {
	it.each([null, 'Production reports'])(
		'refuses description %s until the case-write API preserves it',
		(description) => {
			const input = diskCase({ credentials: [{ type: 'httpHeaderAuth', description }] });
			expect(unsupportedPushReason(input)).toContain('description');
			const body = diskCaseToLangTracerCreate(input, 'description-case', {
				suiteId: 8,
				setKind: 'regression',
				synthetic: true,
			});
			expect(body.credentials).toEqual(input.credentials);
		},
	);

	it('allows credentials without descriptions', () => {
		expect(
			unsupportedPushReason(diskCase({ credentials: [{ type: 'httpHeaderAuth' }] })),
		).toBeNull();
	});

	it('refuses a case whose prompt version would be lost', () => {
		expect(unsupportedPushReason(diskCase({ promptVersion: 'progressive@1' }))).toContain(
			'promptVersion',
		);
	});
	it.each(['default', 'progressive'] as const)(
		'refuses a case whose %s mode would be lost',
		(buildMode) => {
			expect(unsupportedPushReason(diskCase({ buildMode }))).toContain('buildMode');
		},
	);

	it('returns null for a plain conversation-driven case', () => {
		expect(unsupportedPushReason(diskCase())).toBeNull();
	});

	it('flags a replay seed as unsupported — its trace expires, so it has no suite home', () => {
		const reason = unsupportedPushReason(diskCase({ seed: { mode: 'replay', threadId: 't' } }));
		expect(reason).toMatch(/replay seed/);
	});

	it('ALLOWS an inline seed — a durable fixture the write API stores verbatim', () => {
		const reason = unsupportedPushReason(
			diskCase({
				seed: {
					mode: 'inline',
					messages: [
						{
							id: 'm1',
							type: 'llm',
							role: 'user',
							createdAt: '2026-06-29T09:00:00.000Z',
							content: [{ type: 'text', text: 'build it' }],
						},
					],
					workflows: [],
					dataTables: [],
					agents: [],
					folders: [],
					projects: [],
				},
			}),
		);
		expect(reason).toBeNull();
	});

	// The write API's `seed` key set carries `projects` now (same rules as this
	// schema: unique, trimmed, ≤255 chars, ≤5), so a project-scope case is a durable
	// fixture the suite can hold. The push's read-back check still catches a
	// deployment that predates the key.
	it('ALLOWS an inline seed that carries projects — the write API stores them', () => {
		const reason = unsupportedPushReason(
			diskCase({
				seed: {
					mode: 'inline',
					messages: [],
					workflows: [],
					dataTables: [],
					agents: [],
					folders: [],
					projects: [{ name: 'Foobar' }],
				},
			}),
		);
		expect(reason).toBeNull();
	});

	// The write API's `seed` has no `folders` key and its `workflows[]` items no
	// `parentFolderId`. Pushing anyway would land a folder case WITHOUT its folder and
	// with every workflow at the root — it would still run, and the agent would be
	// graded on finding a folder that does not exist.
	it('REFUSES an inline seed that carries folders, until lang-tracer stores them', () => {
		const reason = unsupportedPushReason(
			diskCase({
				seed: {
					mode: 'inline',
					messages: [],
					workflows: [],
					dataTables: [],
					agents: [],
					folders: [{ id: 'odwFolder0001', name: 'ODW' }],
					projects: [],
				},
			}),
		);
		expect(reason).toMatch(/folders/);
	});

	it('REFUSES an inline seed whose workflow is placed in a folder, even with no folder listed', () => {
		const reason = unsupportedPushReason(
			diskCase({
				seed: {
					mode: 'inline',
					messages: [],
					workflows: [
						{
							id: 'odwSignal1Wf',
							name: 'Odds Watch - 1',
							nodes: [],
							connections: {},
							parentFolderId: 'odwFolder0001',
						},
					],
					dataTables: [],
					agents: [],
					folders: [],
					projects: [],
				},
			}),
		);
		expect(reason).toMatch(/parentFolderId/);
	});

	it('carries the inline seed into the create body verbatim', () => {
		const seed = {
			mode: 'inline' as const,
			messages: [
				{
					id: 'm1',
					type: 'llm',
					role: 'assistant' as const,
					createdAt: '2026-06-29T09:00:00.000Z',
					content: [{ type: 'text', text: 'built it' }],
				},
			],
			workflows: [{ id: 'wKk3RmT9xQ2bVn7L', name: 'Batch loop', nodes: [], connections: {} }],
			dataTables: [],
			agents: [],
			folders: [],
			projects: [],
		};
		const body = diskCaseToLangTracerCreate(diskCase({ seed }), 'repair-it', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});
		// Minus the empty `folders` slot: the write API's `seed` has no such key, so
		// even the schema default would 400 every seeded push.
		const { folders: _empty, ...pushable } = seed;
		expect(body.seed).toEqual(pushable);
	});

	it('omits the seed key entirely for an unseeded case', () => {
		const body = diskCaseToLangTracerCreate(diskCase(), 'plain', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});
		expect('seed' in body).toBe(false);
	});
});

// A suite is only a safe home for a hand-off case if `attach` survives the whole
// loop — push, store, export, reparse. It needs lang-tracer #119 deployed to carry
// the key; the last case here is what a pre-#119 deployment gives back, and it must
// fail loudly rather than run as a quietly different (find-it) test.
describe('attach round-trip: write → export → reparse', () => {
	const WORKFLOW_ID = 'wKk3RmT9xQ2bVn7L';

	function handoffCase(): EvalTestCaseInput {
		return diskCase({
			// The faithful editor hand-off: no typed text, a workflow attached.
			conversation: [{ role: 'user', text: '', attach: { workflow: WORKFLOW_ID } }],
			seed: {
				mode: 'inline',
				messages: [
					{
						id: 'm1',
						type: 'llm',
						role: 'assistant',
						createdAt: '2026-06-29T09:00:00.000Z',
						content: [{ type: 'text', text: 'built it' }],
					},
				],
				workflows: [{ id: WORKFLOW_ID, name: 'Batch loop', nodes: [], connections: {} }],
				dataTables: [],
				agents: [],
				folders: [],
				projects: [],
			},
		} as Partial<EvalTestCaseInput>);
	}

	/** What `GET /suites/:id/export` returns: disk shape plus export-only keys. */
	function exportedFrom(conversation: unknown, seed: unknown) {
		return {
			id: 42,
			name: 'handoff',
			suiteId: 1,
			createdAt: '2026-08-04T00:00:00.000Z',
			conversation,
			seed,
			complexity: 'simple',
			tags: ['build'],
			datasets: ['full'],
			processExpectations: ['acknowledges the workflow it was handed'],
		};
	}

	it('carries attach into the create body', () => {
		const body = diskCaseToLangTracerCreate(handoffCase(), 'handoff', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});

		expect(body.conversation).toEqual([
			{ role: 'user', text: '', attach: { workflow: WORKFLOW_ID } },
		]);
	});

	it('reparses from the export with the attachment intact', () => {
		const body = diskCaseToLangTracerCreate(handoffCase(), 'handoff', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});

		const parsed = EvalTestCaseSchema.parse(
			normalizeExportedCase(exportedFrom(body.conversation, body.seed)),
		);

		expect(parsed.conversation?.[0].attach).toEqual({ workflow: WORKFLOW_ID });
	});

	it('carries an Agent attachment through create, export, and reparse', () => {
		const agentId = 'AgentMcpRepairSeed01';
		const agentCase = diskCase({
			conversation: [{ role: 'user', text: '', attach: { agent: agentId } }],
			seed: {
				mode: 'inline',
				messages: [],
				workflows: [],
				dataTables: [],
				folders: [],
				projects: [],
				agents: [
					{
						id: agentId,
						config: {
							name: 'Notion research',
							model: 'anthropic/claude-sonnet-4-5',
							instructions: 'Research company notes.',
						},
					},
				],
			},
		} as Partial<EvalTestCaseInput>);
		const body = diskCaseToLangTracerCreate(agentCase, 'agent-handoff', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});

		const parsed = EvalTestCaseSchema.parse(
			normalizeExportedCase(exportedFrom(body.conversation, body.seed)),
		);

		expect(parsed.conversation?.[0].attach).toEqual({ agent: agentId });
	});

	it('fails at load when the deployment stripped attach, instead of running as a find-it case', () => {
		const stripped = exportedFrom([{ role: 'user', text: '' }], handoffCase().seed);

		expect(() => EvalTestCaseSchema.parse(normalizeExportedCase(stripped))).toThrow(
			/opening turn with empty text must carry/,
		);
	});
});
