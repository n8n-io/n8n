import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { checkContextAssertions } from '../harness/context-assertions';

/** Real capture shape: system prompt string plus SDK message parts. */
function debug(system: string, messages?: unknown[]): InstanceAiRunDebugResponse[] {
	return [
		{
			threadId: 't1',
			runId: 'r1',
			startedAt: 1,
			steps: [{ stepNumber: 0, input: messages ? { system, messages } : { system } }],
			workflowCode: [],
		},
	];
}

describe('checkContextAssertions', () => {
	it('returns nothing when a case declares none', () => {
		expect(checkContextAssertions(undefined, debug('sys'))).toEqual([]);
		expect(checkContextAssertions([], debug('sys'))).toEqual([]);
	});

	it('passes when the value is present, naming the tier it was found in', () => {
		const [v] = checkContextAssertions(
			[{ text: '#ops-alerts' }],
			debug('sys', [{ role: 'user', content: 'post failures to #ops-alerts please' }]),
		);
		expect(v.pass).toBe(true);
		expect(v.kind).toBe('memory');
		expect(v.reason).toContain('message window');
	});

	it('fails when the value never reached the context', () => {
		const [v] = checkContextAssertions(
			[{ text: 'maxTries' }],
			debug('sys', [{ role: 'user', content: 'just fetch it' }]),
		);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('not present');
	});

	it('finds values that arrived inside a tool result', () => {
		// The whole point: fetched context arrives as a tool payload, not as prose.
		const [v] = checkContextAssertions(
			[{ text: 'triggerAtHour' }],
			debug('sys', [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-result',
							toolName: 'workflows',
							output: { nodes: [{ parameters: { rule: { triggerAtHour: 6 } } }] },
						},
					],
				},
			]),
		);
		expect(v.pass).toBe(true);
	});

	it('searches the system prompt and the observation block too', () => {
		const sys = 'You are a builder.\n<observations>channel is #ops-alerts</observations>';
		const [inObs] = checkContextAssertions([{ text: '#ops-alerts' }], debug(sys));
		expect(inObs.pass).toBe(true);
		expect(inObs.reason).toContain('observation block');

		const [inSys] = checkContextAssertions([{ text: 'You are a builder' }], debug(sys));
		expect(inSys.pass).toBe(true);
		expect(inSys.reason).toContain('system prompt');
	});

	it('supports must-NOT-appear for stale values that should have been dropped', () => {
		const stale = debug('sys', [{ role: 'user', content: 'the old column was email_address' }]);
		const [present] = checkContextAssertions([{ text: 'email_address', mustAppear: false }], stale);
		expect(present.pass).toBe(false);
		expect(present.reason).toContain('still present');

		const [absent] = checkContextAssertions(
			[{ text: 'email_address', mustAppear: false }],
			debug('sys', [{ role: 'user', content: 'the column is subscriber_email' }]),
		);
		expect(absent.pass).toBe(true);
		expect(absent.reason).toContain('correctly absent');
	});

	it('matches case-insensitively, since casing drifts as content is re-rendered', () => {
		const [v] = checkContextAssertions(
			[{ text: 'notify ops' }],
			debug('sys', [{ role: 'user', content: 'the alert node is called Notify Ops' }]),
		);
		expect(v.pass).toBe(true);
	});

	it('searches past the judge truncation cap', () => {
		// The judge's view is capped so the interesting part stays in its attention;
		// this check has no such limit, so a value in an elided region is still found.
		const buried = [
			{ role: 'user', content: 'x'.repeat(200_000) },
			{ role: 'user', content: 'BURIED_NEEDLE' },
			{ role: 'user', content: 'y'.repeat(200_000) },
		];
		const [v] = checkContextAssertions([{ text: 'BURIED_NEEDLE' }], debug('sys', buried));
		expect(v.pass).toBe(true);
	});

	it('records incomplete, not failed, when no run debug was captured', () => {
		const [v] = checkContextAssertions([{ text: 'anything' }], undefined);
		expect(v.pass).toBe(false);
		expect(v.incomplete).toBe(true);
		expect(v.kind).toBe('memory');
		expect(v.reason).toContain('no run debug');
	});

	it('includes the author note in the verdict label', () => {
		const [v] = checkContextAssertions(
			[{ text: '2026-03-01', note: 'the cutover agreed at thread start' }],
			debug('sys'),
		);
		expect(v.expectation).toContain('2026-03-01');
		expect(v.expectation).toContain('the cutover agreed at thread start');
	});
});

/**
 * The distinction the at-probe snapshot exists to make. Fixtures are multi-run so
 * the snapshot (first step of the LAST run) genuinely differs from the end state —
 * a single-step fixture would pass either way and prove nothing.
 */
describe('checkContextAssertions — retained vs re-derived', () => {
	const step = (stepNumber: number, windowText: string) => ({
		stepNumber,
		input: { system: 'sys', messages: [{ role: 'user', content: windowText }] },
	});

	const twoRuns = (
		firstRunWindow: string,
		lastRunFirstStep: string,
		lastRunLaterStep: string,
	): InstanceAiRunDebugResponse[] => [
		{
			threadId: 't1',
			runId: 'run-1',
			startedAt: 100,
			steps: [step(0, firstRunWindow)],
			workflowCode: [],
		},
		{
			threadId: 't1',
			runId: 'run-2',
			startedAt: 200,
			steps: [step(0, lastRunFirstStep), step(1, lastRunLaterStep)],
			workflowCode: [],
		},
	];

	it('fails a value the agent only produced while answering, and says it was re-derived', () => {
		const debug = twoRuns(
			'earlier turn, no cutover mentioned',
			'now add the write step',
			'I am applying the 2026-03-01 cutover as agreed',
		);
		const [v] = checkContextAssertions([{ text: '2026-03-01' }], debug);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('NOT retained');
		expect(v.reason).toContain('re-derived');
	});

	it('passes a value the memory subsystem actually carried to the probe', () => {
		const debug = twoRuns(
			'earlier turn',
			'the 2026-03-01 cutover still applies; now add the write step',
			'building it now',
		);
		const [v] = checkContextAssertions([{ text: '2026-03-01' }], debug);
		expect(v.pass).toBe(true);
		expect(v.reason).toContain('retained');
		expect(v.reason).not.toContain('NOT retained');
	});

	it('counts a fact carried across turns as retained, not re-derived', () => {
		// Restated in an earlier turn and still present when the probe arrived: it did
		// travel, which is retention. Only same-turn restatement is the confound.
		const debug = twoRuns(
			'agreed: cutover 2026-03-01',
			'2026-03-01 is still in the window; now add the write step',
			'done',
		);
		const [v] = checkContextAssertions([{ text: '2026-03-01' }], debug);
		expect(v.pass).toBe(true);
		expect(v.reason).toContain('present at the probe');
	});

	it('distinguishes never-had-it from re-derived-it', () => {
		const never = twoRuns('nothing relevant', 'now add the write step', 'still nothing');
		const [v] = checkContextAssertions([{ text: '2026-03-01' }], never);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('nor anywhere by the end');
		expect(v.reason).not.toContain('re-derived');
	});

	it('judges must-NOT-appear against the probe snapshot too', () => {
		// A stale value the agent re-introduced while answering did not survive INTO
		// the probe, so the absence claim holds at the moment that matters.
		const debug = twoRuns('old column email_address', 'now dedupe them', 'using email_address');
		const [v] = checkContextAssertions([{ text: 'email_address', mustAppear: false }], debug);
		expect(v.pass).toBe(true);
		expect(v.reason).toContain('correctly absent');
	});
});

describe('deep values inside large tool payloads', () => {
	/** The regression this guards: assertions promise to search the untruncated
	 *  context, but the extractor also caps each tool payload for the judge. Sharing
	 *  that cap made a value the model demonstrably received report as absent — and
	 *  fetched workflows, executions, docs and table schemas routinely exceed it, so
	 *  it hit exactly the retrieved content this check exists to verify. */
	const bigToolResult = (needle: string) => [
		{
			role: 'assistant',
			content: [
				{
					type: 'tool-result',
					toolName: 'get_workflow_details',
					// Needle sits well past the judge's 4,000-char per-payload cap.
					output: { padding: 'y'.repeat(9_000), alertChannel: needle },
				},
			],
		},
	];

	it('finds a value parked past the judge’s per-payload cap', () => {
		const [v] = checkContextAssertions(
			[{ text: '#ops-escalations' }],
			debug('sys', bigToolResult('#ops-escalations')),
		);
		expect(v.pass).toBe(true);
		expect(v.reason).toContain('message window');
	});

	it('still reports a genuinely absent value as absent', () => {
		// The cap fix must not turn the check into one that always passes.
		const [v] = checkContextAssertions(
			[{ text: '#does-not-exist' }],
			debug('sys', bigToolResult('#ops-escalations')),
		);
		expect(v.pass).toBe(false);
	});

	it('honours a must-NOT-appear claim against a large payload', () => {
		const [v] = checkContextAssertions(
			[{ text: '#ops-escalations', mustAppear: false }],
			debug('sys', bigToolResult('#ops-escalations')),
		);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('still present');
	});
});

describe('anchor selection', () => {
	/** Two runs: the value arrives only in the SECOND run's later step — i.e. the agent
	 *  fetched it after the request landed. That is the shape every within-turn
	 *  retrieval has, and the shape the probe anchor structurally cannot see. */
	const fetchedDuringTurn: InstanceAiRunDebugResponse[] = [
		{
			threadId: 't1',
			runId: 'r1',
			startedAt: 1,
			steps: [
				{
					stepNumber: 1,
					input: { system: 'sys', messages: [{ role: 'user', content: 'build me a sync' }] },
				},
			],
			workflowCode: [],
		},
		{
			threadId: 't1',
			runId: 'r2',
			startedAt: 2,
			steps: [
				// The probe: the request has arrived, nothing fetched yet.
				{
					stepNumber: 1,
					input: { system: 'sys', messages: [{ role: 'user', content: 'match the siblings' }] },
				},
				// Then the agent goes and gets it.
				{
					stepNumber: 2,
					input: {
						system: 'sys',
						messages: [
							{
								role: 'assistant',
								content: [
									{
										type: 'tool-result',
										toolName: 'workflows',
										output: { retryOnFail: 'maxTries-3' },
									},
								],
							},
						],
					},
				},
			],
			workflowCode: [],
		},
	];

	it('sees a within-turn fetch when anchored at turn end', () => {
		const [v] = checkContextAssertions(
			[{ text: 'maxTries-3', anchor: 'turn-end' }],
			fetchedDuringTurn,
		);
		expect(v.pass).toBe(true);
		expect(v.reason).toContain('by the end of the turn');
		// Not called retention: a fetch is a different thing from having carried it in.
		expect(v.reason).not.toContain('retained');
	});

	it('cannot see the same fetch at the probe, and says why', () => {
		// The regression this guards: grading a retrieval claim at the probe fails every
		// time regardless of whether retrieval worked, because tool calls land later.
		const [v] = checkContextAssertions([{ text: 'maxTries-3' }], fetchedDuringTurn);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('NOT retained');
	});

	it('defaults to the probe anchor when none is given', () => {
		const [probe] = checkContextAssertions([{ text: 'maxTries-3' }], fetchedDuringTurn);
		const [explicit] = checkContextAssertions(
			[{ text: 'maxTries-3', anchor: 'probe' }],
			fetchedDuringTurn,
		);
		expect(probe.pass).toBe(explicit.pass);
		expect(probe.reason).toBe(explicit.reason);
	});

	it('labels a turn-end claim so the verdict is not ambiguous', () => {
		const [v] = checkContextAssertions(
			[{ text: 'maxTries-3', anchor: 'turn-end' }],
			fetchedDuringTurn,
		);
		expect(v.expectation).toContain('[by turn end]');
	});

	it('honours must-NOT-appear at turn end', () => {
		// A stale value the agent re-fetched is still present, and must fail.
		const [v] = checkContextAssertions(
			[{ text: 'maxTries-3', mustAppear: false, anchor: 'turn-end' }],
			fetchedDuringTurn,
		);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('still present at the end of the turn');
	});
});
