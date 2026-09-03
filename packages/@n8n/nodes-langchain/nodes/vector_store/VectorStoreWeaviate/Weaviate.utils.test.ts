import { jsonParse } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WeaviateClient } from 'weaviate-client';

import { registerIntegrationHeader, getIntegrationVersion } from './Weaviate.utils';

/**
 * Counts `readFile` calls while delegating to the real implementation, so the
 * walk-up still runs against the real filesystem and only the memoization
 * assertion depends on the instrumentation.
 *
 * Held in hoisted state rather than a `vi.fn()` for two reasons: the shared
 * config sets `restoreMocks: true`, which would wipe a mock implementation
 * before each test; and the identity must survive `vi.resetModules()`, which
 * re-runs the factory below for the fresh module graph.
 */
const fsReads = vi.hoisted(() => ({ paths: [] as string[] }));

vi.mock('node:fs/promises', async () => {
	const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
	return {
		...actual,
		readFile: async (...args: Parameters<typeof actual.readFile>) => {
			fsReads.paths.push(String(args[0]));
			return await actual.readFile(...args);
		},
	};
});

const INTEGRATION_HEADER = 'X-Weaviate-Client-Integration';

/**
 * Read synchronously, and via an explicit path to the package root, so it is
 * independent of both the walk-up under test and the instrumented `readFile`
 * above. The assertions fail if the walk resolves some other `package.json`.
 */
const packageJsonPath = resolve(__dirname, '../../../package.json');

const { version: packageVersion } = jsonParse<{ version: string }>(
	readFileSync(packageJsonPath, 'utf8'),
);

const clientWithHeaders = (headers: unknown) =>
	({
		getConnectionDetails: vi.fn().mockResolvedValue({ host: 'localhost', headers }),
	}) as unknown as WeaviateClient;

describe('getIntegrationVersion', () => {
	it('resolves the version of this package, not of some other package.json', async () => {
		await expect(getIntegrationVersion()).resolves.toBe(packageVersion);
		expect(packageVersion).toMatch(/^\d+\.\d+\.\d+/);
	});

	it('reads package.json once, even for concurrent first callers', async () => {
		// Fresh module instance, so the memo cache starts empty.
		vi.resetModules();
		const { getIntegrationVersion: freshGetIntegrationVersion } =
			await import('./Weaviate.utils.js');

		// Reset after the import, so only the calls below are counted.
		fsReads.paths.length = 0;

		const [first, second] = await Promise.all([
			freshGetIntegrationVersion(),
			freshGetIntegrationVersion(),
		]);
		const third = await freshGetIntegrationVersion();

		expect([first, second, third]).toEqual([packageVersion, packageVersion, packageVersion]);
		// The walk probes several directories, but the package.json it resolves is
		// read exactly once: without the memo each of the three calls would read it.
		expect(fsReads.paths.filter((path) => path === packageJsonPath)).toHaveLength(1);
	});
});

describe('registerIntegrationHeader', () => {
	it('tags the live headers object with the integration header and package version', async () => {
		const headers: Record<string, string> = {};

		await registerIntegrationHeader(clientWithHeaders(headers));

		// Mutates the live headers object by reference, so subsequent client
		// requests carry the telemetry header on both transports.
		expect(headers[INTEGRATION_HEADER]).toBe(`n8n-langchain/${packageVersion}`);
	});

	it('never throws when the client does not support getConnectionDetails', async () => {
		const client = {} as unknown as WeaviateClient;

		await expect(registerIntegrationHeader(client)).resolves.toBeUndefined();
	});

	it('leaves array-form headers untouched', async () => {
		const headers: Array<[string, string]> = [['X-Existing', '1']];

		await registerIntegrationHeader(clientWithHeaders(headers));

		expect(headers).toEqual([['X-Existing', '1']]);
	});
});
