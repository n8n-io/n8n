import { BuildFailureTracker, buildFailureSignature } from '../build-failure-tracker';

const joinError = [
	"Failed to parse workflow code: Method 'join' is not an allowed SDK method. Allowed methods: add, to.\n\n> 3 | wf.join(', ')\n      |    ^",
];

describe('buildFailureSignature', () => {
	it('ignores code frames and line numbers so the same violation matches across attempts', () => {
		const first = buildFailureSignature([
			"Failed to parse workflow code: Method 'join' is not an allowed SDK method.\n\n> 3 | a.join()",
		]);
		const second = buildFailureSignature([
			"Failed to parse workflow code: Method 'join' is not an allowed SDK method.\n\n> 17 | b.join()",
		]);
		expect(first).toBe(second);
	});

	it('distinguishes different violations', () => {
		expect(buildFailureSignature(["Method 'join' is not an allowed SDK method"])).not.toBe(
			buildFailureSignature(["Method 'map' is not an allowed SDK method"]),
		);
	});
});

describe('BuildFailureTracker', () => {
	it('escalates only on a repeated failure for the same work item', () => {
		const tracker = new BuildFailureTracker();
		expect(tracker.record('wi_1', joinError)).toBeUndefined();
		const escalation = tracker.record('wi_1', joinError);
		expect(escalation).toBeDefined();
		expect(escalation).toContain('You already tried this');
		expect(escalation).toContain('workflow-sdk-language.md');
		expect(escalation).toContain('Code node');
	});

	it('does not loop: every repeat after the first keeps escalating', () => {
		const tracker = new BuildFailureTracker();
		tracker.record('wi_1', joinError);
		expect(tracker.record('wi_1', joinError)).toBeDefined();
		expect(tracker.record('wi_1', joinError)).toBeDefined();
	});

	it('tracks work items independently', () => {
		const tracker = new BuildFailureTracker();
		tracker.record('wi_1', joinError);
		expect(tracker.record('wi_2', joinError)).toBeUndefined();
	});

	it('resets history after a successful save', () => {
		const tracker = new BuildFailureTracker();
		tracker.record('wi_1', joinError);
		tracker.clear('wi_1');
		expect(tracker.record('wi_1', joinError)).toBeUndefined();
	});
});
