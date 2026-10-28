import type { CDPRelayServer } from '../cdp-relay';
import { createBrowserTools } from './index';

const namesOf = ({ tools }: ReturnType<typeof createBrowserTools>) =>
	tools.map((tool) => tool.name);

describe('createBrowserTools', () => {
	it('includes browser_upload in local mode', () => {
		expect(namesOf(createBrowserTools())).toContain('browser_upload');
	});

	it('omits browser_upload in remote mode', () => {
		const toolkit = createBrowserTools(
			{ mode: 'remote' },
			{
				relay: {} as CDPRelayServer,
				cdpEndpoint: 'ws://127.0.0.1:5678/cdp',
				cdpConnectHeaders: { authorization: 'tok' },
			},
		);

		expect(namesOf(toolkit)).not.toContain('browser_upload');
	});
});
