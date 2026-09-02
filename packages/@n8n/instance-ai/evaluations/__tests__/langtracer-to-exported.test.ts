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
					projects: [],
				},
			}),
		);
		expect(reason).toBeNull();
	});

	// The write API validates `metadata.seed` against a fixed key set, so `projects`
	// is not stored. Pushing anyway would land a project-scope case WITHOUT its seeded
	// project — it would still run, and the agent's refusal would be graded against a
	// project list it never saw. Refusing the push is the only outcome that can't
	// silently corrupt the suite.
	it('REFUSES an inline seed that carries projects, until lang-tracer stores them', () => {
		const reason = unsupportedPushReason(
			diskCase({
				seed: {
					mode: 'inline',
					messages: [],
					workflows: [],
					dataTables: [],
					agents: [],
					projects: [{ name: 'Foobar' }],
				},
			}),
		);
		expect(reason).toMatch(/projects/);
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
			projects: [],
		};
		const body = diskCaseToLangTracerCreate(diskCase({ seed }), 'repair-it', {
			suiteId: 1,
			setKind: 'regression',
			synthetic: true,
		});
		expect(body.seed).toEqual(seed);
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

	it('fails at load when the deployment stripped attach, instead of running as a find-it case', () => {
		const stripped = exportedFrom([{ role: 'user', text: '' }], handoffCase().seed);

		expect(() => EvalTestCaseSchema.parse(normalizeExportedCase(stripped))).toThrow(
			/opening turn with empty text must carry/,
		);
	});
});
