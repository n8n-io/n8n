import { type Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { User } from '@/databases/entities/user';
import { UrlService } from '@/services/url.service';
import { mockInstance } from '@test/mocking';

import { SamlService } from '../../saml.service.ee';
import { getServiceProviderConfigTestReturnUrl } from '../../service-provider.ee';
import type { SamlConfiguration } from '../../types/requests';
import type { SamlUserAttributes } from '../../types/saml-user-attributes';
import { SamlController } from '../saml.controller.ee';

const urlService = mockInstance(UrlService);
urlService.getInstanceBaseUrl.mockReturnValue('');
const samlService = mockInstance(SamlService);
const controller = new SamlController(mock(), samlService, mock(), mock());

const user = mock<User>({
	id: '123',
	password: 'password',
	authIdentities: [],
	role: 'global:owner',
});

const attributes: SamlUserAttributes = {
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	userPrincipalName: 'upn:test@example.com',
};

describe('Test views', () => {
	test('Should render success with template', async () => {
		const req = mock<SamlConfiguration.AcsRequest>();
		const res = mock<Response>();

		req.body.RelayState = getServiceProviderConfigTestReturnUrl();
		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res);

		expect(res.render).toBeCalledWith('saml-connection-test-success', attributes);
	});

	test('Should render failure with template', async () => {
		const req = mock<SamlConfiguration.AcsRequest>();
		const res = mock<Response>();

		req.body.RelayState = getServiceProviderConfigTestReturnUrl();
		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: undefined,
			attributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res);

		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: '', attributes });
	});

	test('Should render error with template', async () => {
		const req = mock<SamlConfiguration.AcsRequest>();
		const res = mock<Response>();

		req.body.RelayState = getServiceProviderConfigTestReturnUrl();
		samlService.handleSamlLogin.mockRejectedValueOnce(new Error('Test Error'));

		await controller.acsPost(req, res);

		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: 'Test Error' });
	});
});
