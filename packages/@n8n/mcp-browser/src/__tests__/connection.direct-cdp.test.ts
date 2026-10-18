import { BrowserConnection } from '../connection';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

const { PlaywrightAdapter, constructed, launch } = vi.hoisted(() => {
	const constructed = vi.fn();
	const launch = vi.fn().mockResolvedValue(undefined);
	class PlaywrightAdapter {
		launch = launch;

		listTabs = vi.fn().mockResolvedValue([]);

		close = vi.fn().mockResolvedValue(undefined);

		constructor(...args: unknown[]) {
			constructed(...args);
		}
	}
	return { PlaywrightAdapter, constructed, launch };
});

vi.mock('../adapters/playwright', () => ({ PlaywrightAdapter }));

describe('BrowserConnection direct CDP mode', () => {
	beforeEach(() => vi.clearAllMocks());

	it('connects the Playwright adapter straight to the given endpoint', async () => {
		const connection = new BrowserConnection(
			{ mode: 'direct_cdp' },
			{ cdpEndpoint: 'wss://connect.example.com', cdpConnectHeaders: { 'X-Test': '1' } },
		);

		await connection.connect();

		expect(constructed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'direct_cdp' }), {
			cdpEndpoint: 'wss://connect.example.com',
			cdpConnectHeaders: { 'X-Test': '1' },
		});
		expect(launch).toHaveBeenCalled();
		expect(connection.isConnected).toBe(true);
	});
});
