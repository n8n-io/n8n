import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('LeasesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('reads the lease timing settings from the environment', () => {
		vi.stubEnv('N8N_LEASES_LEASE_SECONDS', '30');
		vi.stubEnv('N8N_LEASES_RENEW_SECONDS', '6');
		vi.stubEnv('N8N_LEASES_MARGIN_SECONDS', '4');

		const { leases } = Container.get(GlobalConfig);

		expect(leases.leaseSeconds).toBe(30);
		expect(leases.renewSeconds).toBe(6);
		expect(leases.marginSeconds).toBe(4);
	});
});
