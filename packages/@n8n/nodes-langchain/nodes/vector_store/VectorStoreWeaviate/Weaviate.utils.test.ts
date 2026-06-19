import type { WeaviateClient } from 'weaviate-client';

import { registerIntegrationHeader, getN8nVersion } from './Weaviate.utils';

const INTEGRATION_HEADER = 'X-Weaviate-Client-Integration';

describe('getN8nVersion', () => {
	const originalVersion = process.env.N8N_VERSION;

	afterEach(() => {
		if (originalVersion === undefined) {
			delete process.env.N8N_VERSION;
		} else {
			process.env.N8N_VERSION = originalVersion;
		}
	});

	it('returns the N8N_VERSION env var when set', () => {
		process.env.N8N_VERSION = '1.2.3';
		expect(getN8nVersion()).toBe('1.2.3');
	});

	it('falls back to the package version when the env var is missing', () => {
		delete process.env.N8N_VERSION;
		// The package.json version is a non-empty semver-like string.
		expect(getN8nVersion()).toMatch(/^\d+\.\d+\.\d+/);
	});
});

describe('registerIntegrationHeader', () => {
	beforeEach(() => {
		process.env.N8N_VERSION = '9.9.9';
	});

	it('tags the live headers object with the integration header', async () => {
		const headers: Record<string, string> = {};
		const client = {
			getConnectionDetails: vi.fn().mockResolvedValue({ host: 'localhost', headers }),
		} as unknown as WeaviateClient;

		await registerIntegrationHeader(client);

		// Mutates the live headers object by reference, so subsequent client
		// requests carry the telemetry header on both transports.
		expect(headers[INTEGRATION_HEADER]).toBe('n8n-langchain/9.9.9');
	});

	it('never throws when the client does not support getConnectionDetails', async () => {
		const client = {} as unknown as WeaviateClient;

		await expect(registerIntegrationHeader(client)).resolves.toBeUndefined();
	});

	it('leaves array-form headers untouched', async () => {
		const headers: Array<[string, string]> = [['X-Existing', '1']];
		const client = {
			getConnectionDetails: vi.fn().mockResolvedValue({ headers }),
		} as unknown as WeaviateClient;

		await registerIntegrationHeader(client);

		expect(headers).toEqual([['X-Existing', '1']]);
	});
});
