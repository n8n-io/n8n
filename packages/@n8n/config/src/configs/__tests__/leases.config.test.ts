import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('LeasesConfig', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		Container.reset();
	});

	it('should enable via env', () => {
		vi.stubEnv('N8N_LEASES_ENABLED', 'true');

		const { leases } = Container.get(GlobalConfig);

		expect(leases.enabled).toBe(true);
	});
});
