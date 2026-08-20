// Separate from `background.test.ts` because it mocks `RelayConnection` to observe what
// the handshake is handed, which that file's cases must not see.

type ExternalMessageHandler = (
	message: unknown,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void,
) => unknown;

const ALLOWED_ORIGIN = 'https://acme.app.n8n.cloud';
const RELAY_URL = 'wss://acme.app.n8n.cloud/browser-use/extension/abc?token=bu_x';

const { registerSelectedTabs } = vi.hoisted(() => ({
	registerSelectedTabs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./relayConnection', () => ({
	isEligibleTab: () => true,
	// eslint-disable-next-line @typescript-eslint/naming-convention -- must match the real export
	RelayConnection: class {
		onclose: (() => void) | null = null;

		ontabcreated: (() => void) | null = null;

		registerSelectedTabs = registerSelectedTabs;

		close = vi.fn();

		getControlledIds = () => [];

		isAgentCreatedTab = () => false;

		isControlledTab = () => false;
	},
}));

type InternalMessageHandler = (
	message: unknown,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void,
) => unknown;

const externalMessageListeners: ExternalMessageHandler[] = [];
const internalMessageListeners: InternalMessageHandler[] = [];

const chromeMock = {
	runtime: {
		getURL: (path: string) => `chrome-extension://testextensionid/${path}`,
		sendMessage: vi.fn().mockResolvedValue(undefined),
		onMessage: {
			addListener: vi.fn((fn: InternalMessageHandler) => internalMessageListeners.push(fn)),
		},
		onMessageExternal: {
			addListener: vi.fn((fn: ExternalMessageHandler) => externalMessageListeners.push(fn)),
		},
	},
	tabs: {
		query: vi.fn().mockResolvedValue([]),
		get: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
		onCreated: { addListener: vi.fn() },
		onRemoved: { addListener: vi.fn() },
		onUpdated: { addListener: vi.fn() },
	},
	windows: {
		update: vi.fn().mockResolvedValue(undefined),
		create: vi.fn().mockResolvedValue({ tabs: [{ id: 99 }] }),
		getLastFocused: vi.fn().mockResolvedValue({ left: 0, top: 0, width: 1920, height: 1080 }),
	},
	storage: {
		session: {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue({}),
			remove: vi.fn().mockResolvedValue(undefined),
		},
		local: {
			get: vi.fn().mockResolvedValue({ approvedRelayHosts: ['acme.app.n8n.cloud'] }),
			set: vi.fn().mockResolvedValue(undefined),
		},
	},
	webNavigation: { onCreatedNavigationTarget: { addListener: vi.fn() } },
	action: {
		setBadgeText: vi.fn(),
		setBadgeBackgroundColor: vi.fn(),
		setPopup: vi.fn(),
		onClicked: { addListener: vi.fn() },
	},
};

Object.assign(globalThis, { chrome: chromeMock });

/** Relay socket double, so the handshake resolves without a network. */
function stubRelaySocket(opens: boolean): void {
	vi.stubGlobal(
		'WebSocket',
		class {
			onopen: (() => void) | null = null;

			onerror: ((event: unknown) => void) | null = null;

			constructor(public url: string) {
				setTimeout(() => (opens ? this.onopen?.() : this.onerror?.({})), 0);
			}

			close(): void {}
		},
	);
}

const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

/** Drive a message from an extension view, which is how the connect page asks to connect. */
async function sendFromExtensionView(message: unknown): Promise<void> {
	for (const fn of internalMessageListeners) {
		fn(message, {} as chrome.runtime.MessageSender, () => {});
	}
	await flush();
}

/** Returns a getter, since a response can be held open until the flow settles. */
async function sendFromPage(
	type: 'connect' | 'connectResult',
	origin = ALLOWED_ORIGIN,
	relayUrl = RELAY_URL,
): Promise<() => unknown> {
	const holder: { value?: unknown } = {};
	for (const fn of externalMessageListeners) {
		fn({ type, relayUrl }, { origin } as chrome.runtime.MessageSender, (r) => (holder.value = r));
	}
	await flush();
	return () => holder.value;
}

beforeAll(async () => {
	await import('./background');
});

// The throttle keys off Date.now(); step past the window before each case.
let nowMs = 0;
beforeEach(() => {
	nowMs += 60_000;
	vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
	registerSelectedTabs.mockClear();
	chromeMock.windows.create.mockClear();
	chromeMock.action.setPopup.mockClear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('silent connect to an approved host', () => {
	it('attaches no existing tabs, so a prompt-free reconnect cannot reach them', async () => {
		stubRelaySocket(true);

		await sendFromPage('connect');
		await flush();

		expect(registerSelectedTabs).toHaveBeenCalledWith([]);
		expect(chromeMock.windows.create).not.toHaveBeenCalled();
	});

	it('leaves the extension icon usable — there is no pending page to focus', async () => {
		stubRelaySocket(true);

		await sendFromPage('connect');
		await flush();

		expect(chromeMock.action.setPopup).not.toHaveBeenCalledWith({ popup: '' });
	});

	it('reports the connection once the handshake lands', async () => {
		stubRelaySocket(true);

		await sendFromPage('connect');
		await flush();

		expect((await sendFromPage('connectResult'))()).toEqual({ connected: true });
	});

	it('still confirms by hand when a different instance asks', async () => {
		stubRelaySocket(true);

		// Another allowed origin cannot spend an approval granted to this relay's own page.
		const response = await sendFromPage('connect', 'https://other.app.n8n.cloud');
		await flush();

		expect(response()).toEqual({ accepted: true, confirmationRequired: true });
		expect(chromeMock.windows.create).toHaveBeenCalled();
		expect(registerSelectedTabs).not.toHaveBeenCalled();
	});

	it("leaves another instance's pending flow alone when this one lands", async () => {
		stubRelaySocket(true);
		const otherOrigin = 'https://other.app.n8n.cloud';
		const otherRelay = 'wss://other.app.n8n.cloud/browser-use/extension/zzz?token=bu_y';

		// An unapproved instance is mid-confirmation: its popup is open and its page is
		// holding a `connectResult` open, waiting to hear how that went.
		await sendFromPage('connect', otherOrigin, otherRelay);
		const otherResult = await sendFromPage('connectResult', otherOrigin, otherRelay);
		expect(otherResult()).toBeUndefined();

		// Meanwhile a connect page approves a different relay, which reaches connectToRelay
		// without going through the supersede at the top of the external handler.
		await sendFromExtensionView({ type: 'connect', relayUrl: RELAY_URL, selectedTabIds: [] });
		await flush();

		// Settling here would tell that page its connect failed while its popup is still up.
		expect(otherResult()).toBeUndefined();
	});

	it('reports failure promptly instead of leaving the page waiting', async () => {
		stubRelaySocket(false);

		expect((await sendFromPage('connect'))()).toEqual({
			accepted: true,
			confirmationRequired: false,
		});

		// Settled by the failed handshake rather than the page's own timeout.
		const result = await sendFromPage('connectResult');
		await flush();
		expect(result()).toEqual({ connected: false });
	});
});

export {};
