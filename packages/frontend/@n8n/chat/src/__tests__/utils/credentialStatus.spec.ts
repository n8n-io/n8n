import {
	CREDENTIAL_STATUS_MESSAGE_TYPE,
	listenForCredentialStatus,
} from '@n8n/chat/utils/credentialStatus';

describe('listenForCredentialStatus', () => {
	const originalParent = window.parent;
	let stop: (() => void) | undefined;

	function post(data: unknown, source: MessageEventSource | null) {
		window.dispatchEvent(new MessageEvent('message', { data, source }));
	}

	afterEach(() => {
		stop?.();
		stop = undefined;
		Object.defineProperty(window, 'parent', { value: originalParent, configurable: true });
	});

	it('ignores messages when not embedded in a frame (window.parent === window)', () => {
		const onStatus = vi.fn();
		stop = listenForCredentialStatus(onStatus);

		post({ type: CREDENTIAL_STATUS_MESSAGE_TYPE, ready: false, missingCount: 2 }, window);

		expect(onStatus).not.toHaveBeenCalled();
	});

	it('ignores messages whose source is not window.parent', () => {
		const fakeParent = {} as MessageEventSource;
		Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
		const onStatus = vi.fn();
		stop = listenForCredentialStatus(onStatus);

		post({ type: CREDENTIAL_STATUS_MESSAGE_TYPE, ready: false }, {} as MessageEventSource);

		expect(onStatus).not.toHaveBeenCalled();
	});

	it('ignores messages with the wrong shape', () => {
		const fakeParent = {} as MessageEventSource;
		Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
		const onStatus = vi.fn();
		stop = listenForCredentialStatus(onStatus);

		post({ type: 'something-else', ready: false }, fakeParent);
		post({ type: CREDENTIAL_STATUS_MESSAGE_TYPE }, fakeParent);
		post('not an object', fakeParent);

		expect(onStatus).not.toHaveBeenCalled();
	});

	it('forwards a valid credential-status message from the parent frame, defaulting optional fields', () => {
		const fakeParent = {} as MessageEventSource;
		Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
		const onStatus = vi.fn();
		stop = listenForCredentialStatus(onStatus);

		post({ type: CREDENTIAL_STATUS_MESSAGE_TYPE, ready: false, missingCount: 3 }, fakeParent);

		expect(onStatus).toHaveBeenCalledWith({ ready: false, missingCount: 3, testMode: false });
	});

	it('passes through an explicit testMode flag', () => {
		const fakeParent = {} as MessageEventSource;
		Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
		const onStatus = vi.fn();
		stop = listenForCredentialStatus(onStatus);

		post({ type: CREDENTIAL_STATUS_MESSAGE_TYPE, ready: true, testMode: true }, fakeParent);

		expect(onStatus).toHaveBeenCalledWith({ ready: true, missingCount: 0, testMode: true });
	});

	it('stops forwarding messages once stopped', () => {
		const fakeParent = {} as MessageEventSource;
		Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
		const onStatus = vi.fn();
		stop = listenForCredentialStatus(onStatus);
		stop();

		post({ type: CREDENTIAL_STATUS_MESSAGE_TYPE, ready: true }, fakeParent);

		expect(onStatus).not.toHaveBeenCalled();
	});
});
