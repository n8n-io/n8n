import { Container } from '@n8n/di';

import { AppsConfig } from '../apps.config';

afterEach(() => {
	vi.unstubAllEnvs();
	Container.reset();
});

it('loads positive integer limits from the environment', () => {
	vi.stubEnv('N8N_APPS_MAX_VERSIONS_PER_APP', '50');
	vi.stubEnv('N8N_APPS_MAX_BUNDLES_PER_APP', '10');
	vi.stubEnv('N8N_APPS_MAX_STORAGE_BYTES', '4294967296');
	vi.stubEnv('N8N_APPS_MAX_ARTIFACT_SIZE_BYTES', '1000');
	vi.stubEnv('N8N_APPS_MAX_ARTIFACT_UNPACKED_SIZE_BYTES', '5000');
	vi.stubEnv('N8N_APPS_MAX_ARTIFACT_ENTRIES', '100');
	const config = Container.get(AppsConfig);
	expect(config).toMatchObject({
		maxVersionsPerApp: 50,
		maxBundlesPerApp: 10,
		maxStorageBytes: 4294967296,
		maxArtifactSizeBytes: 1000,
		maxArtifactUnpackedSizeBytes: 5000,
		maxArtifactEntries: 100,
	});
});

it.each(['0', '-1', '1.5', 'not a number', '2147483648'])(
	'rejects an invalid artifact size: %s',
	(value) => {
		vi.stubEnv('N8N_APPS_MAX_ARTIFACT_SIZE_BYTES', value);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(Container.get(AppsConfig).maxArtifactSizeBytes).toBe(
			new AppsConfig().maxArtifactSizeBytes,
		);
	},
);
