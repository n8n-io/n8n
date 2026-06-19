import type { WeaviateClient } from 'weaviate-client';

import { registerIntegrationHeader, getIntegrationVersion } from './Weaviate.utils';

const INTEGRATION_HEADER = 'X-Weaviate-Client-Integration';

describe('getIntegrationVersion', () => {
	it('resolves the package version from the nearest package.json', () => {
		const version = getIntegrationVersion();
		// A non-empty semver-like string read from package.json — never a default
		// or empty value, which would mean the package.json could not be found.
		expect(version).toMatch(/^\d+\.\d+\.\d+/);
	});
});

describe('registerIntegrationHeader', () => {
	it('tags the live headers object with the integration header and package version', async () => {
		const headers: Record<string, string> = {};
		const client = {
			getConnectionDetails: vi.fn().mockResolvedValue({ host: 'localhost', headers }),
		} as unknown as WeaviateClient;

		await registerIntegrationHeader(client);

		// Mutates the live headers object by reference, so subsequent client
		// requests carry the telemetry header on both transports.
		expect(headers[INTEGRATION_HEADER]).toBe(`n8n-langchain/${getIntegrationVersion()}`);
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
