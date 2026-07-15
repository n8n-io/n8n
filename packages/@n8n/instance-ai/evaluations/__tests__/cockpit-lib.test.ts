import {
	appendCalibrationNote,
	browserAuthCookie,
	extractCockpitFlags,
	instanceAiThreadUrl,
	RunRegistry,
} from '../cockpit/lib';

describe('instanceAiThreadUrl', () => {
	it('deep-links to the built thread when a threadId is known', () => {
		expect(instanceAiThreadUrl('http://localhost:5678', 'abc-123')).toBe(
			'http://localhost:5678/assistant/abc-123',
		);
	});

	it('opens the empty builder when there is no thread yet', () => {
		expect(instanceAiThreadUrl('http://localhost:5678', undefined)).toBe(
			'http://localhost:5678/assistant',
		);
	});

	it('normalises a trailing slash on the base url', () => {
		expect(instanceAiThreadUrl('http://localhost:5678/', 'abc-123')).toBe(
			'http://localhost:5678/assistant/abc-123',
		);
	});

	it('encodes a threadId with url-unsafe characters', () => {
		expect(instanceAiThreadUrl('http://localhost:5678', 'a b/c')).toBe(
			'http://localhost:5678/assistant/a%20b%2Fc',
		);
	});
});

describe('browserAuthCookie', () => {
	it('appends browser-scoped attributes to a bare n8n-auth cookie', () => {
		// Cookies are not port-scoped (RFC 6265), so a host-only cookie set by the
		// cockpit on localhost is sent to the instance iframe on another localhost port.
		expect(browserAuthCookie('n8n-auth=abc.def.ghi')).toBe(
			'n8n-auth=abc.def.ghi; Path=/; SameSite=Lax',
		);
	});

	it('keeps only the name=value pair when the input carries attributes', () => {
		expect(browserAuthCookie('n8n-auth=abc; HttpOnly; Secure')).toBe(
			'n8n-auth=abc; Path=/; SameSite=Lax',
		);
	});
});

describe('extractCockpitFlags', () => {
	it('pulls --port and leaves the rest for parseCliArgs', () => {
		expect(extractCockpitFlags(['--port', '6000', '--base-url', 'x'])).toEqual({
			port: 6000,
			runAll: false,
			rest: ['--base-url', 'x'],
		});
	});

	it('defaults the port and recognises --run-all', () => {
		expect(extractCockpitFlags(['--run-all', '--filter', 'foo'])).toEqual({
			port: 5679,
			runAll: true,
			rest: ['--filter', 'foo'],
		});
	});

	it('ignores a non-numeric --port value and keeps the default', () => {
		expect(extractCockpitFlags(['--port', 'nope'])).toEqual({
			port: 5679,
			runAll: false,
			rest: [],
		});
	});
});

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
