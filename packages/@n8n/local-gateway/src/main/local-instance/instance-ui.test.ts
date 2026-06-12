const { mockCookiesSet, mockLoadUrl, mockBrowserWindow } = vi.hoisted(() => {
	const mockCookiesSet = vi.fn();
	const mockLoadUrl = vi.fn();
	const mockBrowserWindow = vi.fn(function (this: { loadURL: typeof mockLoadUrl }) {
		this.loadURL = mockLoadUrl;
	});
	return { mockCookiesSet, mockLoadUrl, mockBrowserWindow };
});

vi.mock('electron', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention -- Electron's class name
	BrowserWindow: mockBrowserWindow,
	session: {
		fromPartition: vi.fn(() => ({ cookies: { set: mockCookiesSet } })),
	},
}));

import { openInstanceUi } from './instance-ui';
import { LOCAL_INSTANCE_URL } from './local-instance-config';
import type { LocalInstanceManager } from './local-instance-manager';

function makeManager(cookiePair: string): LocalInstanceManager {
	return {
		getUiAuthCookie: vi.fn().mockResolvedValue(cookiePair),
	} as unknown as LocalInstanceManager;
}

describe('openInstanceUi', () => {
	const openExternal = vi.fn<(url: string) => Promise<void>>();

	beforeEach(() => {
		vi.clearAllMocks();
		mockCookiesSet.mockResolvedValue(undefined);
		mockLoadUrl.mockResolvedValue(undefined);
		openExternal.mockResolvedValue(undefined);
	});

	it('opens the local instance in a webview, injecting the auth cookie', async () => {
		await openInstanceUi({
			instanceUrl: LOCAL_INSTANCE_URL,
			localManager: makeManager('n8n-auth=jwt-value'),
			openExternal,
		});

		expect(mockCookiesSet).toHaveBeenCalledWith(
			expect.objectContaining({
				url: LOCAL_INSTANCE_URL,
				name: 'n8n-auth',
				value: 'jwt-value',
				httpOnly: true,
			}),
		);
		expect(mockBrowserWindow).toHaveBeenCalledWith(
			expect.objectContaining({ webPreferences: { partition: 'local-n8n-ui' } }),
		);
		expect(mockLoadUrl).toHaveBeenCalledWith(LOCAL_INSTANCE_URL);
		expect(openExternal).not.toHaveBeenCalled();
	});

	it('opens a remote instance in the browser, not a webview', async () => {
		await openInstanceUi({
			instanceUrl: 'https://workspace.app.n8n.cloud',
			localManager: null,
			openExternal,
		});

		expect(openExternal).toHaveBeenCalledWith('https://workspace.app.n8n.cloud');
		expect(mockBrowserWindow).not.toHaveBeenCalled();
	});

	it('opens a remote instance in the browser even when a local manager exists', async () => {
		await openInstanceUi({
			instanceUrl: 'https://workspace.app.n8n.cloud',
			localManager: makeManager('n8n-auth=jwt-value'),
			openExternal,
		});

		expect(openExternal).toHaveBeenCalledWith('https://workspace.app.n8n.cloud');
		expect(mockBrowserWindow).not.toHaveBeenCalled();
	});

	it('rejects a malformed local cookie pair without opening a window', async () => {
		await expect(
			openInstanceUi({
				instanceUrl: LOCAL_INSTANCE_URL,
				localManager: makeManager('garbage'),
				openExternal,
			}),
		).rejects.toThrow('Malformed auth cookie');
		expect(mockBrowserWindow).not.toHaveBeenCalled();
	});

	it('throws when signed out (no instance URL)', async () => {
		await expect(
			openInstanceUi({ instanceUrl: null, localManager: null, openExternal }),
		).rejects.toThrow('Not signed in');
	});
});
