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
	...jest.requireActual('../../saml-helpers'),
	isConnectionTestRequest: jest.fn(),
	isSamlLicensedAndEnabled: jest.fn(),
}));

import { isConnectionTestRequest, isSamlLicensedAndEnabled } from '../../saml-helpers';
import { type ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';

const authService = mock<AuthService>();
const samlService = mock<SamlService>();
const urlService = mock<UrlService>();
const eventService = mock<EventService>();
const provisioningService = mock<ProvisioningService>();
const controller = new SamlController(
	authService,
	samlService,
	urlService,
	eventService,
	provisioningService,
);

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
	n8nInstanceRole: 'n8n_instance_role',
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
		expect(res.redirect).toHaveBeenCalledWith('/');
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
		expect(res.redirect).toHaveBeenCalledWith('/custom/redirect');
	});

	describe('Redirect URL Sanitization in acsHandler', () => {
		test('Should sanitize malicious external redirect URL to default', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();
			const maliciousRelayState = 'https://evil.com/phishing';

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, { RelayState: maliciousRelayState });

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			// Should redirect to default '/' instead of external URL
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should allow valid relative URL', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();
			const validRelayState = '/workflows/123';

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, { RelayState: validRelayState });

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			expect(res.redirect).toHaveBeenCalledWith('/workflows/123');
		});

		test('Should allow same-origin absolute URL', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();
			const sameOriginRelayState = 'http://localhost:5678/workflows/123';

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, { RelayState: sameOriginRelayState });

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			// sanitizeRedirectUrl returns the absolute URL as-is for same-origin
			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/workflows/123');
		});

		test('Should default to / when RelayState is empty string', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, { RelayState: '' });

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should default to / when RelayState is undefined', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, {});

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should block javascript: protocol', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();
			const xssRelayState = 'javascript:alert(1)';

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, { RelayState: xssRelayState });

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		test('Should sanitize URL with whitespace', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();
			const relayStateWithSpaces = '  /workflows/123  ';

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				onboardingRequired: false,
			});

			await controller.acsPost(req, res, { RelayState: relayStateWithSpaces });

			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
			expect(res.redirect).toHaveBeenCalledWith('/workflows/123');
		});
	});
});

describe('initSsoGet - Redirect URL Sanitization', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		samlService.getLoginRequestUrl.mockResolvedValue({
			binding: 'redirect',
			context: { context: 'http://idp.example.com/sso', id: 'id' },
		});
	});

	test('Should sanitize malicious redirect URL from query params', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: 'https://evil.com/phishing' },
			headers: {},
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		// Should call getLoginRequestUrl with default '/' instead of malicious URL
		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
	});

	test('Should allow valid relative URL from query params', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: '/workflows/123' },
			headers: {},
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/workflows/123');
	});

	test('Should sanitize malicious redirect URL from referer header', async () => {
		const req = mock<AuthlessRequest>({
			query: {},
			headers: { referer: 'http://localhost:5678/?redirect=https%3A%2F%2Fevil.com%2Fphishing' },
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		// Should use default '/' instead of malicious URL from referer
		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
	});

	test('Should allow valid relative URL from referer header', async () => {
		const req = mock<AuthlessRequest>({
			query: {},
			headers: { referer: 'http://localhost:5678/?redirect=%2Fworkflows%2F123' },
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/workflows/123');
	});

	test('Should default to / when no redirect provided', async () => {
		const req = mock<AuthlessRequest>({
			query: {},
			headers: {},
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
	});

	test('Should handle POST binding response', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: '/workflows' },
			headers: {},
		});
		const res = mock<Response>();

		samlService.getLoginRequestUrl.mockResolvedValue({
			binding: 'post',
			context: {
				context: 'http://idp.example.com/sso',
				id: 'test-entity',
				// type: 'SAMLRequest',
			},
		});

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/workflows');
		expect(res.send).toHaveBeenCalled();
	});

	test('Should block same-origin URL with different protocol', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: 'https://localhost:5678/workflows' },
			headers: {},
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		// Should default to '/' since protocol doesn't match
		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
	});

	test('Should handle empty string redirect gracefully', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: '' },
			headers: {},
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
	});

	test('Should handle whitespace-only redirect', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: '   ' },
			headers: {},
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
	});

	test('Should prioritize referer header over query param', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: '/from-query' },
			headers: { referer: 'http://localhost:5678/?redirect=%2Ffrom-referer' },
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		// Referer header takes priority over query param
		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/from-referer');
	});

	test('Should fallback to query param when referer has no redirect', async () => {
		const req = mock<AuthlessRequest>({
			query: { redirect: '/from-query' },
			headers: { referer: 'http://localhost:5678/' },
		});
		const res = mock<Response>();

		await controller.initSsoGet(req, res);

		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/from-query');
	});
});
