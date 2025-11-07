import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import config from '@/config';

import { reloadAuthenticationMethod } from '../sso-helpers';

jest.mock('@/config');

describe('sso-helpers', () => {
	let settingsRepository: SettingsRepository;
	let mockConfig: any;

	beforeEach(() => {
		jest.resetAllMocks();
		Container.reset();

		settingsRepository = mock<SettingsRepository>();
		Container.set(SettingsRepository, settingsRepository);

		mockConfig = {
			set: jest.fn(),
		};
		(config as any).set = mockConfig.set;
	});

	describe('reloadAuthenticationMethod', () => {
		it('should reload authentication method from database', async () => {
			const mockSetting = {
				key: 'userManagement.authenticationMethod',
				value: 'oidc',
			};

			settingsRepository.findByKey = jest.fn().mockResolvedValue(mockSetting);

			await reloadAuthenticationMethod();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(
				'userManagement.authenticationMethod',
			);
			expect(mockConfig.set).toHaveBeenCalledWith('userManagement.authenticationMethod', 'oidc');
		});

		it('should handle valid authentication methods', async () => {
			const validMethods = ['ldap', 'email', 'saml', 'oidc'];

			for (const method of validMethods) {
				const mockSetting = {
					key: 'userManagement.authenticationMethod',
					value: method,
				};

				settingsRepository.findByKey = jest.fn().mockResolvedValue(mockSetting);

				await reloadAuthenticationMethod();

				expect(mockConfig.set).toHaveBeenCalledWith('userManagement.authenticationMethod', method);
			}
		});

		it('should handle invalid authentication method', async () => {
			const mockSetting = {
				key: 'userManagement.authenticationMethod',
				value: 'invalid-method',
			};

			settingsRepository.findByKey = jest.fn().mockResolvedValue(mockSetting);

			await reloadAuthenticationMethod();

			expect(mockConfig.set).not.toHaveBeenCalled();
		});

		it('should handle missing authentication method setting', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue(null);

			await reloadAuthenticationMethod();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(
				'userManagement.authenticationMethod',
			);
			expect(mockConfig.set).not.toHaveBeenCalled();
		});

		it('should handle database errors gracefully', async () => {
			const error = new Error('Database connection failed');
			settingsRepository.findByKey = jest.fn().mockRejectedValue(error);

			await expect(reloadAuthenticationMethod()).rejects.toThrow('Database connection failed');

			expect(mockConfig.set).not.toHaveBeenCalled();
		});
	});
});
