import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import {
	useExtensionDirectConnect,
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

function installChromeMock(): void {
	(globalThis as { chrome?: unknown }).chrome = chromeMock;
}

function removeChromeMock(): void {
	delete (globalThis as { chrome?: unknown }).chrome;
}

/** Respond per message type, as the extension background would. */
function mockExtensionResponses(responses: Record<string, unknown>): void {
	chromeMock.runtime.lastError = undefined;
	chromeMock.runtime.sendMessage = vi.fn(
		(_extensionId: string, message: unknown, callback: (response: unknown) => void) => {
			const type = (message as { type: string }).type;
			if (type in responses) {
				callback(responses[type]);
			} else {
				chromeMock.runtime.lastError = { message: 'Receiving end does not exist.' };
				callback(undefined);
			}
		},
	);
}

let wrappers: VueWrapper[] = [];

function mountComposable(): ReturnType<typeof useExtensionDirectConnect> {
	let result!: ReturnType<typeof useExtensionDirectConnect>;
	const TestComponent = defineComponent({
		setup() {
			result = useExtensionDirectConnect();
		},
		template: '<div />',
	});
	wrappers.push(mount(TestComponent));
	return result;
}

beforeEach(() => {
	vi.useFakeTimers();
	installChromeMock();
	mockExtensionResponses({ ping: { pong: true }, connect: { accepted: true } });
});

afterEach(() => {
	for (const wrapper of wrappers) wrapper.unmount();
	wrappers = [];
	removeChromeMock();
	vi.useRealTimers();
});

describe('useExtensionDirectConnect', () => {
	it('is unsupported when the page has no extension messaging API', async () => {
		removeChromeMock();
		const { status, attempt } = mountComposable();

		expect(await attempt(CONNECT_URL)).toBe(false);
		expect(status.value).toBe('unsupported');
	});

	it('is unsupported when the connect URL is malformed or lacks a relay URL', async () => {
		const { status, attempt } = mountComposable();

		expect(await attempt('chrome-extension://testextensionid/connect.html')).toBe(false);
		expect(status.value).toBe('unsupported');
	});

	it('is unsupported when the extension does not answer the ping', async () => {
		mockExtensionResponses({});
		const { status, attempt } = mountComposable();

		expect(await attempt(CONNECT_URL)).toBe(false);
		expect(status.value).toBe('unsupported');
	});

	it('waits for confirmation after the extension accepts the connect request', async () => {
		const { status, attempt } = mountComposable();

		expect(await attempt(CONNECT_URL)).toBe(true);
		expect(status.value).toBe('waiting');
		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
			'testextensionid',
			{ type: 'connect', relayUrl: RELAY_URL },
			expect.any(Function),
		);
	});

	it('fails when the confirmation does not arrive in time', async () => {
		const { status, attempt } = mountComposable();
		await attempt(CONNECT_URL);

		vi.advanceTimersByTime(DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS);

		expect(status.value).toBe('failed');
	});

	it('fails when the extension rejects the connect request', async () => {
		mockExtensionResponses({
			ping: { pong: true },
			connect: { accepted: false, error: 'Too many connect requests.' },
		});
		const { status, attempt } = mountComposable();

		expect(await attempt(CONNECT_URL)).toBe(false);
		expect(status.value).toBe('failed');
	});

	it('fails when messaging breaks after a successful ping', async () => {
		mockExtensionResponses({ ping: { pong: true } });
		const { status, attempt } = mountComposable();

		expect(await attempt(CONNECT_URL)).toBe(false);
		expect(status.value).toBe('failed');
	});

	it('stops the confirmation timeout when the component unmounts', async () => {
		const { status, attempt } = mountComposable();
		await attempt(CONNECT_URL);

		for (const wrapper of wrappers) wrapper.unmount();
		wrappers = [];
		vi.advanceTimersByTime(DIRECT_CONNECT_CONFIRMATION_TIMEOUT_MS);

		expect(status.value).toBe('waiting');
	});
});
