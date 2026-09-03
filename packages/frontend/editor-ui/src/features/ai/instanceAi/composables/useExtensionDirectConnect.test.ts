import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	useExtensionDirectConnect,
	resetExtensionDirectConnect,
	DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS,
} from './useExtensionDirectConnect';

const RELAY_URL = 'wss://acme.app.n8n.cloud/browser-use/extension/session?token=bu_x';
const CONNECT_URL = `chrome-extension://testextensionid/connect.html?mcpRelayUrl=${encodeURIComponent(RELAY_URL)}`;

type SendMessage = (
	extensionId: string,
	message: unknown,
	callback: (response: unknown) => void,
) => void;

const chromeMock: { runtime: { sendMessage: SendMessage; lastError?: { message?: string } } } = {
	runtime: { sendMessage: vi.fn() },
};

const HOLD_RESPONSE = Symbol('hold');
let heldCallbacks: Array<(response: unknown) => void> = [];

function mockExtensionResponses(responses: Record<string, unknown | typeof HOLD_RESPONSE>): void {
	chromeMock.runtime.lastError = undefined;
	heldCallbacks = [];
	chromeMock.runtime.sendMessage = vi.fn(
		(_extensionId: string, message: unknown, callback: (response: unknown) => void) => {
			const type = (message as { type: string }).type;
			if (!(type in responses)) {
				chromeMock.runtime.lastError = { message: 'Receiving end does not exist.' };
				callback(undefined);
				return;
			}
			const value = responses[type];
			if (value === HOLD_RESPONSE) {
				heldCallbacks.push(callback);
				return;
			}
			callback(value);
		},
	);
}

async function settle(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

beforeEach(() => {
	resetExtensionDirectConnect();
	vi.useFakeTimers();
	(globalThis as { chrome?: unknown }).chrome = chromeMock;
	mockExtensionResponses({ connect: { accepted: true }, connectResult: HOLD_RESPONSE });
});

afterEach(() => {
	delete (globalThis as { chrome?: unknown }).chrome;
	vi.useRealTimers();
});

describe('useExtensionDirectConnect', () => {
	it('is unsupported when the page has no extension messaging API', async () => {
		delete (globalThis as { chrome?: unknown }).chrome;
		const { status, attempt } = useExtensionDirectConnect();

		await attempt(CONNECT_URL);

		expect(status.value).toBe('unsupported');
	});

	it('is unsupported when the connect URL lacks a relay URL', async () => {
		const { status, attempt } = useExtensionDirectConnect();

		await attempt('chrome-extension://testextensionid/connect.html');

		expect(status.value).toBe('unsupported');
	});

	it('is unsupported when the extension does not answer', async () => {
		mockExtensionResponses({});
		const { status, attempt } = useExtensionDirectConnect();

		await attempt(CONNECT_URL);

		expect(status.value).toBe('unsupported');
	});

	it('is unsupported when the extension does not accept the request', async () => {
		mockExtensionResponses({ connect: { accepted: false } });
		const { status, attempt } = useExtensionDirectConnect();

		await attempt(CONNECT_URL);

		expect(status.value).toBe('unsupported');
	});

	it('waits for the connect result after the extension opened the popup', async () => {
		const { status, attempt } = useExtensionDirectConnect();

		void attempt(CONNECT_URL);
		await settle();

		expect(status.value).toBe('waiting');
		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
			'testextensionid',
			{ type: 'connectResult', relayUrl: RELAY_URL },
			expect.any(Function),
		);
	});

	it('clears the previous flow status before waiting on the extension', async () => {
		mockExtensionResponses({ connect: HOLD_RESPONSE });
		const { status, attempt } = useExtensionDirectConnect();
		status.value = 'failed';

		void attempt(CONNECT_URL);

		// A caller watching this state must not read the outcome of a connect that ended.
		expect(status.value).toBe('idle');
	});

	it('shares one live flow across independent callers', async () => {
		const first = useExtensionDirectConnect();
		const second = useExtensionDirectConnect();

		void first.attempt(CONNECT_URL);
		await vi.advanceTimersByTimeAsync(0);

		// The modal mounts mid-flight and must render the running attempt, not start a second.
		expect(second.status.value).toBe('waiting');
		expect(second.isAttempting.value).toBe(true);
	});

	it('reports connecting, not waiting, when no confirmation was shown', async () => {
		mockExtensionResponses({
			connect: { accepted: true, confirmationRequired: false },
			connectResult: HOLD_RESPONSE,
		});
		const { status, attempt } = useExtensionDirectConnect();

		void attempt(CONNECT_URL);
		await vi.advanceTimersByTimeAsync(0);

		// A remembered host attaches silently — there is no popup to point the user at.
		expect(status.value).toBe('connecting');
	});

	it('fails as soon as the extension reports an unsuccessful connect', async () => {
		const { status, attempt } = useExtensionDirectConnect();
		const pending = attempt(CONNECT_URL);
		await settle();

		heldCallbacks[0]({ connected: false });
		await pending;

		expect(status.value).toBe('failed');
	});

	it('settles on a terminal state when the extension reports a successful connect', async () => {
		const { status, attempt } = useExtensionDirectConnect();
		const pending = attempt(CONNECT_URL);
		await settle();

		heldCallbacks[0]({ connected: true });
		await pending;

		// A finished flow left on an in-progress status makes every later reader — the
		// connections row especially — believe a connect is still running.
		expect(status.value).toBe('connected');
	});

	it('fails when no connect result arrives in time', async () => {
		const { status, attempt } = useExtensionDirectConnect();
		void attempt(CONNECT_URL);
		await settle();

		vi.advanceTimersByTime(DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS);
		await settle();

		expect(status.value).toBe('failed');
	});

	it('ignores a second attempt while one is in flight', async () => {
		mockExtensionResponses({ connect: HOLD_RESPONSE, connectResult: HOLD_RESPONSE });
		const { status, attempt } = useExtensionDirectConnect();
		void attempt(CONNECT_URL);
		await settle();
		void attempt(CONNECT_URL);
		await settle();

		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(1);

		heldCallbacks[0]({ accepted: true });
		await settle();
		expect(status.value).toBe('waiting');
	});
});
