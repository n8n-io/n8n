import { appendCalibrationNote, RunRegistry } from '../cockpit/lib';

describe('appendCalibrationNote', () => {
	it('creates a harness-note description when there is none yet', () => {
		expect(appendCalibrationNote(undefined, 'harness', 'Sheets node needs a real doc id')).toBe(
			'Harness note: Sheets node needs a real doc id',
		);
	});

	it('uses the capability-gap prefix and appends to an existing description', () => {
		const result = appendCalibrationNote(
			'Scheduled digest to Slack.',
			'capability-gap',
			'build never filters to the bug label',
		);
		expect(result).toBe(
			'Scheduled digest to Slack.\n\nCapability-gap finding: build never filters to the bug label',
		);
	});
});

describe('RunRegistry', () => {
	it('starts every case idle', () => {
		const registry = new RunRegistry(['a', 'b']);
		expect(registry.snapshot()).toEqual([
			{ slug: 'a', status: 'idle' },
			{ slug: 'b', status: 'idle' },
		]);
	});

	it('claims an idle case, and refuses to claim it again while in-flight', () => {
		const registry = new RunRegistry(['a']);
		expect(registry.claim('a')).toBe(true);
		expect(registry.get('a').status).toBe('building');
		expect(registry.claim('a')).toBe(false);
	});

	it('re-allows a claim after the case finishes', () => {
		const registry = new RunRegistry(['a']);
		registry.claim('a');
		const result = { workflowBuildSuccess: true };
		registry.finish('a', result);
		const entry = registry.get('a');
		expect(entry.status).toBe('done');
		expect(entry.result).toBe(result);
		expect(registry.claim('a')).toBe(true);
	});

	it('records an error and re-allows a claim after failure', () => {
		const registry = new RunRegistry(['a']);
		registry.claim('a');
		registry.fail('a', 'boom');
		const entry = registry.get('a');
		expect(entry.status).toBe('error');
		expect(entry.error).toBe('boom');
		expect(registry.claim('a')).toBe(true);
	});

	it('throws when claiming an unknown slug', () => {
		const registry = new RunRegistry(['a']);
		expect(() => registry.claim('nope')).toThrow(/unknown/i);
	});

	it('reports in-flight status without mutating state', () => {
		const registry = new RunRegistry(['a']);
		expect(registry.isInFlight('a')).toBe(false);
		registry.claim('a');
		expect(registry.isInFlight('a')).toBe(true);
		// read-only: still claimable-refused, i.e. unchanged
		expect(registry.get('a').status).toBe('building');
	});
});
