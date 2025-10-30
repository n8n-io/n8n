import { GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { type Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import type { EventService } from '@/events/event.service';
import type { AuthlessRequest } from '@/requests';
import type { UrlService } from '@/services/url.service';

import type { SamlService } from '../../saml.service.ee';
import { getServiceProviderConfigTestReturnUrl } from '../../service-provider.ee';
import type { SamlUserAttributes } from '../../types';
import { SamlController } from '../saml.controller.ee';

// Mock the saml-helpers module
jest.mock('../../saml-helpers', () => ({
	isConnectionTestRequest: jest.fn(),
	isSamlLicensedAndEnabled: jest.fn(),
}));

import { isConnectionTestRequest, isSamlLicensedAndEnabled } from '../../saml-helpers';

const authService = mock<AuthService>();
const samlService = mock<SamlService>();
const urlService = mock<UrlService>();
const eventService = mock<EventService>();
const controller = new SamlController(authService, samlService, urlService, eventService);

const user = mock<User>({
	id: '123',
	password: 'password',
	authIdentities: [],
	role: GLOBAL_OWNER_ROLE,
});

const attributes: SamlUserAttributes = {
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	userPrincipalName: 'upn:test@example.com',
};

describe('Test views', () => {
	const RelayState = getServiceProviderConfigTestReturnUrl();

	beforeEach(() => {
		// Mock the helper functions for test connection flow
		(isConnectionTestRequest as jest.Mock).mockReturnValue(true);
	});

	test('Should render success with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		});

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
		const res = mock<Response>({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		});

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
		const res = mock<Response>({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		});

		samlService.handleSamlLogin.mockRejectedValueOnce(new Error('Test Error'));

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: 'Test Error' });
	});
});

describe('SAML Login Flow', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Mock the helper functions for actual login flow (not test connections)
		(isConnectionTestRequest as jest.Mock).mockReturnValue(false);
		(isSamlLicensedAndEnabled as jest.Mock).mockReturnValue(true);

		// Mock URL service
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
	});

	test('Should issue cookie with MFA flag set to true on successful SAML login', async () => {
		const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
		const res = mock<Response>();

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState: '/' });

		// Verify that issueCookie was called with MFA flag set to true
		expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
		expect(eventService.emit).toHaveBeenCalledWith('user-logged-in', {
			user,
			authenticationMethod: 'saml',
		});
		expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/');
	});

	test('Should issue cookie with MFA flag set to true when onboarding is required', async () => {
		const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
		const res = mock<Response>();

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			onboardingRequired: true,
		});

		await controller.acsPost(req, res, { RelayState: '/' });

		// Verify that issueCookie was called with MFA flag set to true
		expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
		expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/saml/onboarding');
	});

	test('Should respect custom RelayState redirect URL', async () => {
		const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
		const res = mock<Response>();
		const customRelayState = '/custom/redirect';

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState: customRelayState });

		expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
		expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/custom/redirect');
	});
});
