import { SettingsRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { IdentityProviderInstance, ServiceProviderInstance } from 'samlify';

import * as samlHelpers from '@/sso.ee/saml/saml-helpers';
import { SamlService } from '@/sso.ee/saml/saml.service.ee';
import { mockInstance } from '@test/mocking';

import { SAML_PREFERENCES_DB_KEY } from '../constants';
import { InvalidSamlMetadataError } from '../errors/invalid-saml-metadata.error';

describe('SamlService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const samlService = new SamlService(mock(), mock(), mock(), mock(), settingsRepository);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('getAttributesFromLoginResponse', () => {
		test('throws when any attribute is missing', async () => {
			// ARRANGE
			jest
				.spyOn(samlService, 'getIdentityProviderInstance')
				.mockReturnValue(mock<IdentityProviderInstance>());

			const serviceProviderInstance = mock<ServiceProviderInstance>();
			serviceProviderInstance.parseLoginResponse.mockResolvedValue({
				samlContent: '',
				extract: {},
			});
			jest
				.spyOn(samlService, 'getServiceProviderInstance')
				.mockReturnValue(serviceProviderInstance);

			jest.spyOn(samlHelpers, 'getMappedSamlAttributesFromFlowResult').mockReturnValue({
				attributes: {} as never,
				missingAttributes: [
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
					'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
				],
			});

			// ACT & ASSERT
			await expect(
				samlService.getAttributesFromLoginResponse(mock<express.Request>(), 'post'),
			).rejects.toThrowError(
				'SAML Authentication failed. Invalid SAML response (missing attributes: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn).',
			);
		});
	});

	describe('init', () => {
		test('calls `reset` if an InvalidSamlMetadataError is thrown', async () => {
			// ARRANGE
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(new InvalidSamlMetadataError());
			jest.spyOn(samlService, 'reset');

			// ACT
			await samlService.init();

			// ASSERT
			expect(samlService.reset).toHaveBeenCalledTimes(1);
		});

		test('calls `reset` if a SyntaxError is thrown', async () => {
			// ARRANGE
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(new SyntaxError());
			jest.spyOn(samlService, 'reset');

			// ACT
			await samlService.init();

			// ASSERT
			expect(samlService.reset).toHaveBeenCalledTimes(1);
		});

		test('does not call reset and rethrows if another error is thrown', async () => {
			// ARRANGE
			jest
				.spyOn(samlService, 'loadFromDbAndApplySamlPreferences')
				.mockRejectedValue(new TypeError());
			jest.spyOn(samlService, 'reset');

			// ACT & ASSERT
			await expect(samlService.init()).rejects.toThrowError(TypeError);
			expect(samlService.reset).toHaveBeenCalledTimes(0);
		});

		test('does not call reset if no error is thrown', async () => {
			// ARRANGE
			jest.spyOn(samlService, 'reset');

			// ACT
			await samlService.init();

			// ASSERT
			expect(samlService.reset).toHaveBeenCalledTimes(0);
		});
	});

	describe('reset', () => {
		test('disables saml login and deletes the saml `features.saml` key in the db', async () => {
			// ARRANGE
			jest.spyOn(samlHelpers, 'setSamlLoginEnabled');
			jest.spyOn(settingsRepository, 'delete');

			// ACT
			await samlService.reset();

			// ASSERT
			expect(samlHelpers.setSamlLoginEnabled).toHaveBeenCalledTimes(1);
			expect(samlHelpers.setSamlLoginEnabled).toHaveBeenCalledWith(false);
			expect(settingsRepository.delete).toHaveBeenCalledTimes(1);
			expect(settingsRepository.delete).toHaveBeenCalledWith({ key: SAML_PREFERENCES_DB_KEY });
		});
	});
});
