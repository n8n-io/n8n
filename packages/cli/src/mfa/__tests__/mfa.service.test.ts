import type { LicenseState } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SettingsRepository, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';

import type { CacheService } from '@/services/cache/cache.service';

import { MFA_ENFORCE_SETTING } from '../constants';
import { MFA_CACHE_KEY, MfaService } from '../mfa.service';
import type { TOTPService } from '../totp.service';

describe('MfaService', () => {
	let mfaService: MfaService;
	let mockUserRepository: jest.Mocked<UserRepository>;
	let mockSettingsRepository: jest.Mocked<SettingsRepository>;
	let mockCacheService: jest.Mocked<CacheService>;
	let mockLicense: jest.Mocked<LicenseState>;
	let mockTotpService: jest.Mocked<TOTPService>;
	let mockCipher: jest.Mocked<Cipher>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockUserRepository = mock<UserRepository>();
		mockSettingsRepository = mock<SettingsRepository>();
		mockCacheService = mock<CacheService>();
		mockLicense = mock<LicenseState>();
		mockTotpService = mock<TOTPService>();
		mockCipher = mock<Cipher>();

		mfaService = new MfaService(
			mockUserRepository,
			mockSettingsRepository,
			mockCacheService,
			mockLicense,
			mockTotpService,
			mockCipher,
			mockLogger(),
		);
	});

	describe('isMFAEnforced', () => {
		it('should return false when license does not allow MFA enforcement', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(false);

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(false);
			expect(mockLicense.isMFAEnforcementLicensed).toHaveBeenCalledTimes(1);
			expect(mockCacheService.get).not.toHaveBeenCalled();
		});

		it('should return true when cached value is "true"', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue('true');

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(true);
			expect(mockCacheService.get).toHaveBeenCalledWith(MFA_CACHE_KEY);
			expect(mockSettingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should return false when cached value is "false"', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue('false');

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(false);
			expect(mockCacheService.get).toHaveBeenCalledWith(MFA_CACHE_KEY);
			expect(mockSettingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should return false when cached value is any other string', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue('some-other-value');

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(false);
			expect(mockCacheService.get).toHaveBeenCalledWith(MFA_CACHE_KEY);
			expect(mockSettingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should load from settings when cache is null', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue(null);
			mockSettingsRepository.findByKey.mockResolvedValue({
				key: MFA_ENFORCE_SETTING,
				value: 'true',
				loadOnStartup: true,
			});

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(true);
			expect(mockCacheService.get).toHaveBeenCalledWith(MFA_CACHE_KEY);
			expect(mockSettingsRepository.findByKey).toHaveBeenCalledWith(MFA_ENFORCE_SETTING);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, 'true');
		});

		it('should load from settings when cache is undefined', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue(undefined);
			mockSettingsRepository.findByKey.mockResolvedValue({
				key: MFA_ENFORCE_SETTING,
				value: 'true',
				loadOnStartup: true,
			});

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(true);
			expect(mockCacheService.get).toHaveBeenCalledWith(MFA_CACHE_KEY);
			expect(mockSettingsRepository.findByKey).toHaveBeenCalledWith(MFA_ENFORCE_SETTING);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, 'true');
		});

		it('should return false when settings value is "false"', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue(null);
			mockSettingsRepository.findByKey.mockResolvedValue({
				key: MFA_ENFORCE_SETTING,
				value: 'false',
				loadOnStartup: true,
			});

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(false);
			expect(mockSettingsRepository.findByKey).toHaveBeenCalledWith(MFA_ENFORCE_SETTING);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, 'false');
		});

		it('should return false when settings value is null', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue(null);
			mockSettingsRepository.findByKey.mockResolvedValue(null);

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(false);
			expect(mockSettingsRepository.findByKey).toHaveBeenCalledWith(MFA_ENFORCE_SETTING);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, undefined);
		});

		it('should return false when settings value is empty string', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);
			mockCacheService.get.mockResolvedValue(null);
			mockSettingsRepository.findByKey.mockResolvedValue({
				key: MFA_ENFORCE_SETTING,
				value: '',
				loadOnStartup: true,
			});

			const result = await mfaService.isMFAEnforced();

			expect(result).toBe(false);
			expect(mockSettingsRepository.findByKey).toHaveBeenCalledWith(MFA_ENFORCE_SETTING);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, '');
		});
	});

	describe('enforceMFA', () => {
		it('should enforce MFA when license allows and value is true', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);

			await mfaService.enforceMFA(true);

			expect(mockLicense.isMFAEnforcementLicensed).toHaveBeenCalledTimes(1);
			expect(mockSettingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: MFA_ENFORCE_SETTING,
					value: 'true',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, 'true');
		});

		it('should disable MFA enforcement when license allows and value is false', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(true);

			await mfaService.enforceMFA(false);

			expect(mockLicense.isMFAEnforcementLicensed).toHaveBeenCalledTimes(1);
			expect(mockSettingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: MFA_ENFORCE_SETTING,
					value: 'false',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, 'false');
		});

		it('should force value to false when license does not allow MFA enforcement', async () => {
			mockLicense.isMFAEnforcementLicensed.mockReturnValue(false);

			await mfaService.enforceMFA(true);

			expect(mockLicense.isMFAEnforcementLicensed).toHaveBeenCalledTimes(1);
			expect(mockSettingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: MFA_ENFORCE_SETTING,
					value: 'false',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(mockCacheService.set).toHaveBeenCalledWith(MFA_CACHE_KEY, 'false');
		});
	});
});
