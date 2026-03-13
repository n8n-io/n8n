import { Container } from '@n8n/di';

import { UserManagementConfig } from '../user-management.config';

const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});

const getUserManagementConfig = (env: Record<string, string> = {}) => {
	process.env = env;
	return Container.get(UserManagementConfig);
};

describe('UserManagementConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	it('should warn on invalid jwt refresh timeout and fall back to default', () => {
		const config = getUserManagementConfig({
			N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS: 'abcd',
		});
		expect(config.jwtRefreshTimeoutHours).toEqual(0);
		expect(consoleWarnMock).toHaveBeenCalledWith(
			'Invalid number value for N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS: abcd',
		);
	});
});
