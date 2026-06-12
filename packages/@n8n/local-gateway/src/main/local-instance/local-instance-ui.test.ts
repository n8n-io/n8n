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

import { LOCAL_INSTANCE_URL } from './local-instance-config';
import type { LocalInstanceManager } from './local-instance-manager';
import { openLocalInstanceUi } from './local-instance-ui';

function makeManager(cookiePair: string): LocalInstanceManager {
	return {
		getUiAuthCookie: vi.fn().mockResolvedValue(cookiePair),
	} as unknown as LocalInstanceManager;
}

describe('openLocalInstanceUi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCookiesSet.mockResolvedValue(undefined);
		mockLoadUrl.mockResolvedValue(undefined);
	});

	it('injects the auth cookie into the window session and loads the instance UI', async () => {
		await openLocalInstanceUi(makeManager('n8n-auth=jwt-value'));

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
	});

	it('rejects a malformed cookie pair without opening a window', async () => {
		await expect(openLocalInstanceUi(makeManager('garbage'))).rejects.toThrow(
			'Malformed auth cookie',
		);
		expect(mockBrowserWindow).not.toHaveBeenCalled();
	});
});
