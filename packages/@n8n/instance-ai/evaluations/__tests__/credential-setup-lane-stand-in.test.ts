import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { startBrowserRuntime } from '../harness/browser-runtime';
import {
	resolveCredentialSetupFixture,
	startCredentialSetupLane,
} from '../harness/credential-setup-lane';
import type { EvalLogger } from '../harness/logger';

vi.mock('../harness/browser-runtime', () => ({
	startBrowserRuntime: vi.fn(),
	attachToRunningBrowser: vi.fn(),
}));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

describe('startCredentialSetupLane stand-in', () => {
	it('exposes the shipped fixture stand-in and its credential field', async () => {
		vi.mocked(startBrowserRuntime).mockResolvedValue({
			close: vi.fn().mockResolvedValue(undefined),
		} as unknown as Awaited<ReturnType<typeof startBrowserRuntime>>);
		const selection = await resolveCredentialSetupFixture({ credentialFixture: 'slack' });

		const lane = await startCredentialSetupLane({
			client: {} as N8nClient,
			selection,
			logger: silentLogger,
		});

		try {
			expect(lane?.credentialType).toBe('slackApi');
			expect(lane?.credentialUrlField).toBe('url');
			expect(lane?.verifyBaseUrl).toMatch(/^http:\/\/.+:\d+$/);
		} finally {
			await lane?.close();
		}
	});
});
