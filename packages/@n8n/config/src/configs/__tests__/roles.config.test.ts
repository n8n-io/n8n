import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('RolesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should default the custom instance roles flag to off', () => {
		const { roles } = Container.get(GlobalConfig);

		expect(roles.customInstanceRolesEnabled).toBe(false);
	});

	it('should enable the custom instance roles flag from env', () => {
		vi.stubEnv('N8N_CUSTOM_INSTANCE_ROLES_ENABLED', 'true');

		const { roles } = Container.get(GlobalConfig);

		expect(roles.customInstanceRolesEnabled).toBe(true);
	});
});
