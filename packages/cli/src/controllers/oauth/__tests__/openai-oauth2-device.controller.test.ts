import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import type { CredentialsEntity, User } from '@n8n/db';
import type { Response as ExpressResponse } from 'express';
import { mock } from 'vitest-mock-extended';

import { OpenAiOAuth2DeviceController } from '@/controllers/oauth/openai-oauth2-device.controller';
import type { OauthService } from '@/oauth/oauth.service';
import type { OAuthRequest } from '@/requests';

describe('OpenAiOAuth2DeviceController', () => {
	const oauthService = mock<OauthService>();
	const controller = new OpenAiOAuth2DeviceController(oauthService);
	const originalFetch = global.fetch;

	const mockResponse = () => {
		const res = mock<ExpressResponse>({ locals: { cspNonce: 'test-nonce' } });
		res.type.mockReturnValue(res);
		res.send.mockReturnValue(res);
		return res;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		oauthService.getCredentialForAuthFlow.mockResolvedValue(
			mock<CredentialsEntity>({ id: 'credential-id', type: 'openAiOAuth2Api' }),
		);
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe('renderDeviceAuthPage', () => {
		const mockDeviceChallenge = (deviceAuthId = 'device-auth-id') => {
			global.fetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						device_auth_id: deviceAuthId,
						user_code: 'USER-CODE',
						interval: '5',
						expires_at: '2026-04-27T11:30:29.549956+00:00',
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } },
				),
			);
		};

		it('renders a device login page that sends the browser ID header while polling', async () => {
			mockDeviceChallenge();
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>(),
			});
			const res = mockResponse();

			await controller.renderDeviceAuthPage(req, res);

			const html = res.send.mock.calls[0][0] as string;
			expect(html).toContain("'browser-id': getBrowserId()");
			expect(html).toContain(`const storageKey = '${BROWSER_ID_STORAGE_KEY}'`);
			expect(html).toContain("credentials: 'same-origin'");
			expect(html).toContain('"expiresAt":1777289429549');
			expect(html).toContain('Continue after authorization');
			expect(html).toContain('Open OpenAI device login');
			expect(html).toContain('const payload = result.data ?? result');
			expect(html).toContain("verificationLink.addEventListener('click'");
			expect(html).toContain("continueButton.addEventListener('click'");
		});

		it('gives the inline script the response nonce, so an enforced CSP allows it', async () => {
			mockDeviceChallenge();
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>(),
			});
			const res = mockResponse();

			await controller.renderDeviceAuthPage(req, res);

			const html = res.send.mock.calls[0][0] as string;
			expect(html).toContain('<script nonce="test-nonce">');
			expect(html).not.toMatch(/\son\w+=/);
		});

		it('escapes challenge data before interpolating it into the inline script', async () => {
			mockDeviceChallenge('device-auth-id</script>');
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id</script><script>alert(1)</script>' },
				user: mock<User>(),
			});
			const res = mockResponse();

			await controller.renderDeviceAuthPage(req, res);

			const html = res.send.mock.calls[0][0] as string;
			expect(html).toContain('credential-id\\u003c/script\\u003e');
			expect(html).toContain('device-auth-id\\u003c/script\\u003e');
			expect(html).not.toContain('credential-id</script><script>alert(1)</script>');
			expect(html).not.toContain('device-auth-id</script>');
		});
	});

	describe('completeDeviceAuth', () => {
		it('exchanges the device code and stores the tokens on the credential', async () => {
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							authorization_code: 'authorization-code',
							code_verifier: 'code-verifier',
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } },
					),
				)
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ access_token: 'access-token' }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					}),
				);

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user: mock<User>() });
			const payload = {
				id: 'credential-id',
				deviceAuthId: 'device-auth-id',
				userCode: 'USER-CODE',
			};

			await expect(
				controller.completeDeviceAuth(req, mock<ExpressResponse>(), payload),
			).resolves.toEqual({
				status: 'success',
			});
			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'credential-id' }),
				{ oauthTokenData: { access_token: 'access-token' } },
				['csrfSecret', 'codeVerifier'],
			);
		});

		it('reports pending while the user has not authorized yet', async () => {
			global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user: mock<User>() });

			await expect(
				controller.completeDeviceAuth(req, mock<ExpressResponse>(), {
					id: 'credential-id',
					deviceAuthId: 'device-auth-id',
					userCode: 'USER-CODE',
				}),
			).resolves.toEqual({ status: 'pending' });
			expect(oauthService.encryptAndSaveData).not.toHaveBeenCalled();
		});

		it('rejects a credential of another type', async () => {
			oauthService.getCredentialForAuthFlow.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'credential-id', type: 'openAiApi' }),
			);

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user: mock<User>() });

			await expect(
				controller.completeDeviceAuth(req, mock<ExpressResponse>(), {
					id: 'credential-id',
					deviceAuthId: 'device-auth-id',
					userCode: 'USER-CODE',
				}),
			).rejects.toThrow('Credential type not supported');
		});
	});
});
