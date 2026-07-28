import type { EvalTestCaseInput } from '../harness/schema';
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

	it('flags seedThread, seedFile and priorConversation as unsupported', () => {
		expect(unsupportedPushReason(diskCase({ seedThread: { threadId: 't' } }))).toMatch(
			/seedThread/,
		);
		expect(unsupportedPushReason(diskCase({ seedFile: '/tmp/seed.json' }))).toMatch(/seedFile/);
		expect(
			unsupportedPushReason(diskCase({ priorConversation: [{ role: 'user', text: 'earlier' }] })),
		).toMatch(/priorConversation/);
	});
});
