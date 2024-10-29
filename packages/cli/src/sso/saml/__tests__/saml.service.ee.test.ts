import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { IdentityProviderInstance, ServiceProviderInstance } from 'samlify';

import { Logger } from '@/logging/logger.service';
import { UrlService } from '@/services/url.service';
import * as samlHelpers from '@/sso/saml/saml-helpers';
import { SamlService } from '@/sso/saml/saml.service.ee';
import { mockInstance } from '@test/mocking';

describe('SamlService', () => {
	const logger = mockInstance(Logger);
	const urlService = mockInstance(UrlService);
	const samlService = new SamlService(logger, urlService);

	describe('getAttributesFromLoginResponse', () => {
		test('throws when any attribute is missing', async () => {
			//
			// ARRANGE
			//
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

			//
			// ACT & ASSERT
			//
			await expect(
				samlService.getAttributesFromLoginResponse(mock<express.Request>(), 'post'),
			).rejects.toThrowError(
				'SAML Authentication failed. Invalid SAML response (missing attributes: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn).',
			);
		});
	});
});
