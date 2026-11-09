import { Container } from '@n8n/di';

import { TracingSourcesConfig } from '../tracing-sources.config';

describe('TracingSourcesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	describe('microsoftAgent365ExportEnabled', () => {
		test('is on when neither switch is set', () => {
			expect(Container.get(TracingSourcesConfig).microsoftAgent365ExportEnabled).toBe(true);
		});

		test('is on when both switches are empty or true', () => {
			vi.stubEnv('ENABLE_OBSERVABILITY', '');
			vi.stubEnv('ENABLE_A365_OBSERVABILITY_EXPORTER', 'true');

			expect(Container.get(TracingSourcesConfig).microsoftAgent365ExportEnabled).toBe(true);
		});

		test.each([
			['ENABLE_OBSERVABILITY', 'false'],
			['ENABLE_A365_OBSERVABILITY_EXPORTER', 'false'],
			['ENABLE_OBSERVABILITY', '1'],
			['ENABLE_A365_OBSERVABILITY_EXPORTER', 'TRUE'],
		])('is off when %s is %s', (envName, value) => {
			vi.stubEnv(envName, value);

			expect(Container.get(TracingSourcesConfig).microsoftAgent365ExportEnabled).toBe(false);
		});
	});
});
