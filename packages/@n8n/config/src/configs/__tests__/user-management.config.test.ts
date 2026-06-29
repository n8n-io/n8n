import { Container } from '@n8n/di';

import { UserManagementConfig } from '../user-management.config';

describe('UserManagementConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	test('with refresh timout > session, sets refresh timout to `0`', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		process.env = {
			N8N_USER_MANAGEMENT_JWT_DURATION_HOURS: '10',
			N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS: '5',
		};

		const config = Container.get(UserManagementConfig);

		expect(config.jwtRefreshTimeoutHours).toBe(5);
		expect(consoleWarnSpy).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});

	describe('invitation rate limits', () => {
		it('applies the documented defaults', () => {
			const config = Container.get(UserManagementConfig);
			expect(config.invitationRateLimit).toBe(10);
			expect(config.invitationAcceptRateLimit).toBe(100);
		});

		it('reads the limits from their environment variables', () => {
			process.env = {
				N8N_INVITATION_RATE_LIMIT: '25',
				N8N_INVITATION_ACCEPT_RATE_LIMIT: '300',
			};
			const config = Container.get(UserManagementConfig);
			expect(config.invitationRateLimit).toBe(25);
			expect(config.invitationAcceptRateLimit).toBe(300);
		});

		it('accepts 0 to disable rate limiting', () => {
			process.env = { N8N_INVITATION_RATE_LIMIT: '0' };
			expect(Container.get(UserManagementConfig).invitationRateLimit).toBe(0);
		});

		it.each(['-5', 'abc', '1.5'])(
			'falls back to the default when given an invalid value (%s)',
			(value) => {
				process.env = { N8N_INVITATION_RATE_LIMIT: value };
				expect(Container.get(UserManagementConfig).invitationRateLimit).toBe(10);
			},
		);
	});
});
