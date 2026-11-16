import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('LeasesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	it('should enable via env', () => {
		vi.stubEnv('N8N_LEASES_ENABLED', 'true');

		const { leases } = Container.get(GlobalConfig);

		expect(leases.enabled).toBe(true);
	});
});
