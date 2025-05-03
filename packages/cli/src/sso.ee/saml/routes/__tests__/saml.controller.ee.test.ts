import type { User } from '@n8n/db';
import { type Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthlessRequest } from '@/requests';

import type { SamlService } from '../../saml.service.ee';
import { getServiceProviderConfigTestReturnUrl } from '../../service-provider.ee';
import type { SamlUserAttributes } from '../../types';
import { SamlController } from '../saml.controller.ee';

const samlService = mock<SamlService>();
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
	const RelayState = getServiceProviderConfigTestReturnUrl();

	test('Should render success with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>();

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-success', attributes);
	});

	test('Should render failure with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>();

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: undefined,
			attributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: '', attributes });
	});

	test('Should render error with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>();

		samlService.handleSamlLogin.mockRejectedValueOnce(new Error('Test Error'));

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: 'Test Error' });
	});
});
