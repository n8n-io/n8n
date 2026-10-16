import type { SamlPreferences, SamlToggleDto } from '@n8n/api-types';
import type { EventService, UrlService } from '@n8n/backend-services';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest, type User } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { type Response } from 'express';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { SsoAccessDeniedError } from '@/modules/provisioning.ee/errors/sso-access-denied.error';
import type { AuthlessRequest } from '@/requests';
import { isSamlLicensedAndEnabled } from '@/sso.ee/sso-helpers';

import { SamlEmailNotVerifiedError } from '../errors/saml-email-not-verified.error';
import { extractTestIdFromRelayState, isConnectionTestRequest } from '../saml-helpers';
import { SamlController } from '../saml.controller.ee';
import type { SamlService } from '../saml.service.ee';
import { getServiceProviderConfigTestReturnUrl } from '../service-provider.ee';
import type { SamlUserAttributes } from '../types';

// Mock the saml-helpers module
vi.mock('../saml-helpers', () => ({
	isConnectionTestRequest: vi.fn(),
	extractTestIdFromRelayState: vi.fn(),
}));

vi.mock('@/sso.ee/sso-helpers', () => ({
	isSamlLicensedAndEnabled: vi.fn(),
}));

const authService = mock<AuthService>();
const samlService = mock<SamlService>();
const urlService = mock<UrlService>();
const eventService = mock<EventService>();
const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: false });
const controller = new SamlController(
	authService,
	samlService,
	urlService,
	eventService,
	instanceSettingsLoaderConfig,
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
};
const rawAttributes = {
	email: 'test@example.com',
	givenName: 'Test',
	surname: 'User',
	groups: ['admins', 'engineers'],
};
const rawAttributesJson = JSON.stringify(rawAttributes, null, 2);

describe('Test views', () => {
	const RelayState = getServiceProviderConfigTestReturnUrl();

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock the helper functions for test connection flow
		(isConnectionTestRequest as Mock).mockReturnValue(true);
		(extractTestIdFromRelayState as Mock).mockReturnValue(undefined);
	});

	test('Should render success with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			rawAttributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-success', {
			...attributes,
			rawAttributesJson,
		});
	});

	test('Should render failure with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: undefined,
			attributes,
			rawAttributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-failed', {
			message: '',
			attributes,
			rawAttributesJson,
		});
	});

	test('Should render error with template', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});

		samlService.handleSamlLogin.mockRejectedValueOnce(new Error('Test Error'));

		await controller.acsPost(req, res, { RelayState });

		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: 'Test Error' });
	});

	test('Should pass cached metadata to handleSamlLogin for test connections', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});
		const testId = 'abc123';
		const metadata = '<EntityDescriptor/>';
		const RelayStateWithTestId = `${RelayState}?t=${testId}`;

		(extractTestIdFromRelayState as Mock).mockReturnValue(testId);
		samlService.consumePendingTestConfig.mockResolvedValueOnce(metadata);
		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			rawAttributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState: RelayStateWithTestId });

		expect(samlService.consumePendingTestConfig).toHaveBeenCalledWith(testId);
		expect(samlService.handleSamlLogin).toHaveBeenCalledWith(req, 'post', metadata);
		expect(res.render).toBeCalledWith('saml-connection-test-success', {
			...attributes,
			rawAttributesJson,
		});
	});

	test('Should still call handleSamlLogin without override when no test token in RelayState', async () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			rawAttributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState });

		expect(samlService.consumePendingTestConfig).not.toHaveBeenCalled();
		expect(samlService.handleSamlLogin).toHaveBeenCalledWith(req, 'post', undefined);
	});
});

describe('configTestPost', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
	});

	test('caches pasted metadata and embeds testId in RelayState', async () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>();
		const metadata = '<EntityDescriptor/>';

		samlService.storePendingTestConfig.mockResolvedValueOnce('tok12345');
		samlService.getLoginRequestUrl.mockResolvedValueOnce({
			binding: 'redirect',
			context: { context: 'http://idp.example.com/login' } as any,
		});

		await controller.configTestPost(req, res, { metadata } as any);

		expect(samlService.fetchMetadataFromUrl).not.toHaveBeenCalled();
		expect(samlService.storePendingTestConfig).toHaveBeenCalledWith(metadata);
		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith(
			'http://localhost:5678/config/test/return?t=tok12345',
			undefined,
			metadata,
		);
	});

	test('fetches metadata from URL and caches it before building login request', async () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>();
		const metadataUrl = 'https://idp.example.com/metadata';
		const fetchedMetadata = '<EntityDescriptor fetched/>';

		samlService.fetchMetadataFromUrl.mockResolvedValueOnce(fetchedMetadata);
		samlService.storePendingTestConfig.mockResolvedValueOnce('tokXYZ');
		samlService.getLoginRequestUrl.mockResolvedValueOnce({
			binding: 'redirect',
			context: { context: 'http://idp.example.com/login' } as any,
		});

		await controller.configTestPost(req, res, { metadataUrl, ignoreSSL: true } as any);

		expect(samlService.fetchMetadataFromUrl).toHaveBeenCalledWith(metadataUrl, true);
		expect(samlService.storePendingTestConfig).toHaveBeenCalledWith(fetchedMetadata);
		expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith(
			'http://localhost:5678/config/test/return?t=tokXYZ',
			undefined,
			fetchedMetadata,
		);
	});
});

describe('SAML Login Flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock the helper functions for actual login flow (not test connections)
		(isConnectionTestRequest as Mock).mockReturnValue(false);
		(extractTestIdFromRelayState as Mock).mockReturnValue(undefined);
		(isSamlLicensedAndEnabled as Mock).mockReturnValue(true);

		// Mock URL service
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
	});

	test('Should issue cookie with MFA flag set to true on successful SAML login', async () => {
		const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
		const res = mock<Response>();

		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			rawAttributes,
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
			rawAttributes,
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
			rawAttributes,
			onboardingRequired: false,
		});

		await controller.acsPost(req, res, { RelayState: customRelayState });

		expect(authService.issueCookie).toHaveBeenCalledWith(res, user, true, 'test-browser-id');
		expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/custom/redirect');
	});

	test('Should redirect a login denied by role mapping to the sign-in page', async () => {
		const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
		const res = mock<Response>();

		samlService.handleSamlLogin.mockRejectedValueOnce(new SsoAccessDeniedError());

		await controller.acsPost(req, res, { RelayState: '/' });

		expect(res.redirect).toHaveBeenCalledWith(
			'http://localhost:5678/signin?ssoError=access-denied',
		);
		expect(authService.issueCookie).not.toHaveBeenCalled();
		expect(eventService.emit).toHaveBeenCalledWith('user-login-failed', {
			userEmail: 'unknown',
			authenticationMethod: 'saml',
			reason: 'Access denied by SSO role mapping configuration',
		});
	});

	test('Should name the account and the reason when the login is denied for an unverified email', async () => {
		const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});

		samlService.handleSamlLogin.mockRejectedValueOnce(
			new SamlEmailNotVerifiedError('test@example.com'),
		);

		await controller.acsPost(req, res, { RelayState: '/' });

		expect(authService.issueCookie).not.toHaveBeenCalled();
		expect(res.redirect).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(eventService.emit).toHaveBeenCalledWith('user-login-failed', {
			userEmail: 'test@example.com',
			authenticationMethod: 'saml',
			reason: 'Email address is not verified by the identity provider',
		});
	});

	describe('Redirect URL Validation', () => {
		test('allows redirect to relative URls starting with slash', async () => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				rawAttributes,
				onboardingRequired: false,
			});
			await controller.acsPost(req, res, { RelayState: '/workflow/123' });

			expect(res.redirect).toHaveBeenCalledWith('http://localhost:5678/workflow/123');
		});

		test('validates redirect URL that is passed in via URL parameter', async () => {
			const req = mock<AuthlessRequest>({
				query: { redirect: '//evil.com/phishing' },
				headers: {},
			});
			const res = mock<Response>();

			samlService.getLoginRequestUrl.mockResolvedValueOnce({
				binding: 'redirect',
				context: { context: 'http://idp.example.com/login' } as any,
			});

			await controller.initSsoGet(req, res);

			expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
		});

		test('validates redirect URL that is passed in via referrer header', async () => {
			const req = mock<AuthlessRequest>({
				query: {},
				headers: {
					referer: 'http://localhost:5678/login?redirect=%2F%2Fevil.com%2Fphishing',
				},
			});
			const res = mock<Response>();

			samlService.getLoginRequestUrl.mockResolvedValueOnce({
				binding: 'redirect',
				context: { context: 'http://idp.example.com/login' } as any,
			});

			await controller.initSsoGet(req, res);

			expect(samlService.getLoginRequestUrl).toHaveBeenCalledWith('/');
		});

		const hostWithoutRedirect = 'http://localhost:5678/';
		test.each([
			['https://evil.com/phishing'],
			['//evil.com/phishing'],
			['javascript:alert(1)'],
			['%2F%2Fevil.com/phishing'],
			['workflows/123'],
		])('does not allow redirect to %s', async (blockedUrl: string) => {
			const req = mock<AuthlessRequest>({ browserId: 'test-browser-id' });
			const res = mock<Response>();

			samlService.handleSamlLogin.mockResolvedValueOnce({
				authenticatedUser: user,
				attributes,
				rawAttributes,
				onboardingRequired: false,
			});
			await controller.acsPost(req, res, { RelayState: blockedUrl });

			expect(res.redirect).toHaveBeenCalledWith(hostWithoutRedirect);
		});
	});
});

describe('SAML env-managed write protection', () => {
	const envManagedConfig = mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: true });
	const envManagedController = new SamlController(
		authService,
		samlService,
		urlService,
		eventService,
		envManagedConfig,
	);

	test('configPost should reject writes when managed by env', async () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>();

		await expect(
			envManagedController.configPost(req, res, { loginEnabled: true } as any),
		).rejects.toThrow('cannot be modified through the API');
	});

	test('toggleEnabledPost should reject writes when managed by env', async () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>();

		await expect(
			envManagedController.toggleEnabledPost(req, res, { loginEnabled: true }),
		).rejects.toThrow('cannot be modified through the API');
	});

	describe('route access scopes', () => {
		test('configGet (read) is gated by saml:manage, matching the write endpoints', () => {
			const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
				SamlController as Controller,
			);
			expect(metadata.routes.get('configGet')?.accessScope).toEqual({
				scope: 'saml:manage',
				globalOnly: true,
			});
		});
	});
});

describe('SSO settings events', () => {
	const previous = {
		loginEnabled: false,
		loginLabel: 'SSO',
		metadata: '<old/>',
		mapping: { email: 'mail', firstName: 'fn', lastName: 'ln', userPrincipalName: 'upn' },
	} as SamlPreferences;

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettingsLoaderConfig.ssoManagedByEnv = false;
		Object.defineProperty(samlService, 'samlPreferences', {
			get: () => previous,
			configurable: true,
		});
	});

	describe('configPost', () => {
		test('emits sso-settings-updated with the names of the changed fields', async () => {
			const saved = { ...previous, metadata: '<new/>', loginEnabled: true } as SamlPreferences;
			samlService.setSamlPreferences.mockResolvedValueOnce(saved);
			const req = mock<AuthenticatedRequest>({ user });

			const result = await controller.configPost(req, mock<Response>(), saved);

			expect(samlService.setSamlPreferences).toHaveBeenCalledWith(saved);
			expect(eventService.emit).toHaveBeenCalledWith('sso-settings-updated', {
				user,
				protocol: 'saml',
				loginEnabled: true,
				fieldsChanged: ['loginEnabled', 'metadata'],
				publicApi: false,
			});
			expect(result).toEqual({ ...saved, signingPrivateKey: undefined });
		});

		test('names the signing key without its value when a new key is stored', async () => {
			const saved = { ...previous, signingPrivateKey: 'encrypted:abc' } as SamlPreferences;
			samlService.setSamlPreferences.mockResolvedValueOnce(saved);

			await controller.configPost(mock<AuthenticatedRequest>({ user }), mock<Response>(), saved);

			expect(eventService.emit).toHaveBeenCalledWith(
				'sso-settings-updated',
				expect.objectContaining({ fieldsChanged: ['signingPrivateKey'] }),
			);
			const [, payload] = eventService.emit.mock.calls[0];
			expect(JSON.stringify(payload)).not.toContain('encrypted:abc');
		});

		test('does not emit when nothing was saved', async () => {
			samlService.setSamlPreferences.mockResolvedValueOnce(undefined);

			await controller.configPost(mock<AuthenticatedRequest>({ user }), mock<Response>(), previous);

			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('does not emit when the settings are managed by the environment', async () => {
			instanceSettingsLoaderConfig.ssoManagedByEnv = true;

			await expect(
				controller.configPost(mock<AuthenticatedRequest>({ user }), mock<Response>(), previous),
			).rejects.toThrow(ForbiddenError);

			expect(samlService.setSamlPreferences).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('toggleEnabledPost', () => {
		test('reports loginEnabled as changed when the toggle flips it', async () => {
			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			await controller.toggleEnabledPost(req, res, { loginEnabled: true } as SamlToggleDto);

			expect(samlService.setSamlPreferences).toHaveBeenCalledWith({ loginEnabled: true });
			expect(eventService.emit).toHaveBeenCalledWith('sso-settings-updated', {
				user,
				protocol: 'saml',
				loginEnabled: true,
				fieldsChanged: ['loginEnabled'],
				publicApi: false,
			});
			expect(res.sendStatus).toHaveBeenCalledWith(200);
		});

		test('reports no changed field when the toggle repeats the stored state', async () => {
			await controller.toggleEnabledPost(mock<AuthenticatedRequest>({ user }), mock<Response>(), {
				loginEnabled: false,
			} as SamlToggleDto);

			expect(eventService.emit).toHaveBeenCalledWith(
				'sso-settings-updated',
				expect.objectContaining({ loginEnabled: false, fieldsChanged: [] }),
			);
		});
	});
});
