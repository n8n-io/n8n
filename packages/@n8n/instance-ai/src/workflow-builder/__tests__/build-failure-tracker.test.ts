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
		expect(
			tracker.record('wi_1', joinError, {
				includeSdkLanguageGuidance: true,
			}),
		).toBeUndefined();
		const escalation = tracker.record('wi_1', joinError, {
			includeSdkLanguageGuidance: true,
		});
		expect(escalation).toBeDefined();
		expect(escalation).toContain('You already tried this');
		expect(escalation).toContain('workflow-sdk-language.md');
		expect(escalation).toContain('Code node');
	});

	it('keeps generic validation repeats free of SDK-specific repair advice', () => {
		const tracker = new BuildFailureTracker();
		const validationError = ['[UNKNOWN_CONFIG_KEY] (Gmail): Unknown config key "recipient"'];
		expect(tracker.record('wi_1', validationError)).toBeUndefined();
		const escalation = tracker.record('wi_1', validationError);
		expect(escalation).toContain('You already tried this');
		expect(escalation).not.toContain('workflow-sdk-language.md');
		expect(escalation).not.toContain('Code node');
	});

	it('adds HTTP raw-body guidance for repeated specifyBody validation failures', () => {
		const tracker = new BuildFailureTracker();
		const validationError = [
			'[INVALID_PARAMETER] (HTTP Request): Node "EWS FindItem": parameters.specifyBody: This field is only allowed when one of: (sendBody=true, contentType="json") or (sendBody=true, contentType="form-urlencoded")',
		];
		expect(tracker.record('wi_1', validationError)).toBeUndefined();
		const escalation = tracker.record('wi_1', validationError);
		expect(escalation).toContain('contentType="raw"');
		expect(escalation).toContain('omit specifyBody');
		expect(escalation).toContain('rawContentType');
		expect(escalation).not.toContain('workflow-sdk-language.md');
	});

	it('adds HTTP raw-body guidance for repeated XML-in-jsonBody validation failures', () => {
		const tracker = new BuildFailureTracker();
		const validationError = [
			"[INVALID_PARAMETER] (Get EWS Mail): 'Get EWS Mail' sends an XML/SOAP payload but is configured as JSON. For XML HTTP Request bodies, set contentType='raw'.",
		];
		expect(tracker.record('wi_1', validationError)).toBeUndefined();
		const escalation = tracker.record('wi_1', validationError);
		expect(escalation).toContain('contentType="raw"');
		expect(escalation).toContain('omit specifyBody');
		expect(escalation).toContain('rawContentType');
		expect(escalation).not.toContain('workflow-sdk-language.md');
	});

	it('adds HTTP raw-body guidance for repeated raw XML body omissions', () => {
		const tracker = new BuildFailureTracker();
		const validationError = [
			"[INVALID_PARAMETER] (Get EWS Mail): 'Get EWS Mail' is configured for a raw XML/SOAP body but the body field is empty.",
		];
		expect(tracker.record('wi_1', validationError)).toBeUndefined();
		const escalation = tracker.record('wi_1', validationError);
		expect(escalation).toContain('contentType="raw"');
		expect(escalation).toContain('body');
		expect(escalation).toContain('rawContentType');
		expect(escalation).not.toContain('workflow-sdk-language.md');
	});

	it('does not loop: every repeat after the first keeps escalating', () => {
		const tracker = new BuildFailureTracker();
		tracker.record('wi_1', joinError, {
			includeSdkLanguageGuidance: true,
		});
		expect(
			tracker.record('wi_1', joinError, {
				includeSdkLanguageGuidance: true,
			}),
		).toBeDefined();
		expect(
			tracker.record('wi_1', joinError, {
				includeSdkLanguageGuidance: true,
			}),
		).toBeDefined();
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
