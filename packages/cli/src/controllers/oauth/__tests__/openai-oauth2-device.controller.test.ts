import type { AuthenticatedRequest, CredentialsEntity, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { OpenAiOAuth2DeviceController } from '@/controllers/oauth/openai-oauth2-device.controller';
import type { OauthService } from '@/oauth/oauth.service';

describe('OpenAiOAuth2DeviceController', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const oauthService = mock<OauthService>();
	const controller = new OpenAiOAuth2DeviceController(credentialsFinderService, oauthService);
	const originalFetch = global.fetch;

	beforeEach(() => {
		jest.clearAllMocks();
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'credential-id',
			type: 'openAiOAuth2Api',
		} as CredentialsEntity);
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe('renderDeviceAuthPage', () => {
		it('renders a device login page that sends the browser ID header while polling', async () => {
			global.fetch = jest.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						device_auth_id: 'device-auth-id',
						user_code: 'USER-CODE',
						interval: '5',
						expires_at: '2026-04-27T11:30:29.549956+00:00',
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } },
				),
			);

			const req = mock<AuthenticatedRequest<{}, {}, {}, { id?: string }>>({
				query: { id: 'credential-id' },
				user: mock<User>(),
			});
			const res = mock<Response>();
			res.type.mockReturnValue(res);
			res.send.mockReturnValue(res);

			await controller.renderDeviceAuthPage(req, res);

			const html = res.send.mock.calls[0][0] as string;
			expect(html).toContain("'browser-id': getBrowserId()");
			expect(html).toContain("credentials: 'same-origin'");
			expect(html).toContain('"expiresAt":1777289429549');
			expect(html).toContain('Continue after authorization');
			expect(html).toContain('class="primary-action"');
			expect(html).toContain('Open OpenAI device login');
			expect(html).toContain('background: #ff6d5a');
			expect(html).toContain('const payload = result.data ?? result');
			expect(html).toContain("verificationLink.addEventListener('click'");
			expect(html).toContain("continueButton.addEventListener('click'");
			expect(html).not.toContain('setTimeout(poll, challenge.intervalMs);\\n\\t\\t\\t}');
		});

		it('escapes challenge data before interpolating it into the inline script', async () => {
			global.fetch = jest.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						device_auth_id: 'device-auth-id</script>',
						user_code: 'USER-CODE',
						interval: '5',
						expires_at: '2026-04-27T11:30:29.549956+00:00',
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } },
				),
			);

			const req = mock<AuthenticatedRequest<{}, {}, {}, { id?: string }>>({
				query: { id: 'credential-id</script><script>alert(1)</script>' },
				user: mock<User>(),
			});
			const res = mock<Response>();
			res.type.mockReturnValue(res);
			res.send.mockReturnValue(res);

			await controller.renderDeviceAuthPage(req, res);

			const html = res.send.mock.calls[0][0] as string;
			expect(html).toContain('credential-id\\u003c/script\\u003e');
			expect(html).toContain('device-auth-id\\u003c/script\\u003e');
			expect(html).not.toContain('credential-id</script><script>alert(1)</script>');
			expect(html).not.toContain('device-auth-id</script>');
		});
	});

	describe('completeDeviceAuth', () => {
		it('reads the device completion payload from the request body', async () => {
			global.fetch = jest
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

			const req = mock<AuthenticatedRequest>({
				user: mock<User>(),
			});
			const res = mock<Response>();
			const payload = {
				id: 'credential-id',
				deviceAuthId: 'device-auth-id',
				userCode: 'USER-CODE',
			};

			await expect(controller.completeDeviceAuth(req, res, payload)).resolves.toEqual({
				status: 'success',
			});
			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'credential-id' }),
				{ oauthTokenData: { access_token: 'access-token' } },
				['csrfSecret', 'codeVerifier'],
			);
		});
	});
});
