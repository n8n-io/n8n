import { Container } from '@n8n/di';

import { UserManagementConfig } from '../user-management.config';

describe('UserManagementConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	test('with refresh timout > session, sets refresh timout to `0`', () => {
		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		process.env = {
			N8N_USER_MANAGEMENT_JWT_DURATION_HOURS: '1',
			N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS: '2',
		};

		const config = Container.get(UserManagementConfig);

		expect(config.jwtRefreshTimeoutHours).toBe(0);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS needs to be smaller than N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. Setting N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS to 0.',
		);

		consoleWarnSpy.mockRestore();
	});

	test('with refresh timout == session, sets refresh timout to `0`', () => {
		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		process.env = {
			N8N_USER_MANAGEMENT_JWT_DURATION_HOURS: '1',
			N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS: '1',
		};

		const config = Container.get(UserManagementConfig);

		expect(config.jwtRefreshTimeoutHours).toBe(0);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS needs to be smaller than N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. Setting N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS to 0.',
		);

		consoleWarnSpy.mockRestore();
	});

	test('with refresh timout < session, keeps refresh timout intact', () => {
		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		process.env = {
			N8N_USER_MANAGEMENT_JWT_DURATION_HOURS: '10',
			N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS: '5',
		};

		const config = Container.get(UserManagementConfig);

		expect(config.jwtRefreshTimeoutHours).toBe(5);
		expect(consoleWarnSpy).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});
});
