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

	it('accepts the largest lease timing value', () => {
		vi.stubEnv('N8N_LEASES_LEASE_SECONDS', '2147483');
		vi.stubEnv('N8N_LEASES_RENEW_SECONDS', '2147483');
		vi.stubEnv('N8N_LEASES_MARGIN_SECONDS', '2147483');

		const { leases } = Container.get(GlobalConfig);

		expect(leases.leaseSeconds).toBe(2147483);
		expect(leases.renewSeconds).toBe(2147483);
		expect(leases.marginSeconds).toBe(2147483);
	});

	it('warns and falls back to the default for a lease shorter than 8 seconds', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_LEASES_LEASE_SECONDS', '7');

		const { leases } = Container.get(GlobalConfig);

		expect(leases.leaseSeconds).toBe(20);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it.each(['0', '-5', '2.5', 'abc', '2147484'])(
		'warns and falls back to the defaults for %s',
		(value) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.stubEnv('N8N_LEASES_LEASE_SECONDS', value);
			vi.stubEnv('N8N_LEASES_RENEW_SECONDS', value);
			vi.stubEnv('N8N_LEASES_MARGIN_SECONDS', value);

			const { leases } = Container.get(GlobalConfig);

			expect(leases.leaseSeconds).toBe(20);
			expect(leases.renewSeconds).toBe(5);
			expect(leases.marginSeconds).toBe(5);
			expect(warn).toHaveBeenCalledTimes(3);
		},
	);
});
