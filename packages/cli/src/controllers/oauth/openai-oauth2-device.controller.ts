import { Z } from '@n8n/api-types';
import { Body, Get, Post, RestController } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response as ExpressResponse } from 'express';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { z } from 'zod';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { OauthService } from '@/oauth/oauth.service';

const OPENAI_OAUTH2_CREDENTIAL_TYPE = 'openAiOAuth2Api';
const OPENAI_CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_DEVICE_AUTHORIZATION_ENDPOINT =
	'https://auth.openai.com/api/accounts/deviceauth/usercode';
const OPENAI_DEVICE_TOKEN_ENDPOINT = 'https://auth.openai.com/api/accounts/deviceauth/token';
const OPENAI_TOKEN_ENDPOINT = 'https://auth.openai.com/oauth/token';
const OPENAI_DEVICE_REDIRECT_URI = 'https://auth.openai.com/deviceauth/callback';
const OPENAI_DEVICE_VERIFICATION_URI = 'https://auth.openai.com/codex/device';

const deviceAuthorizationResponseSchema = z.object({
	device_auth_id: z.string().min(1),
	user_code: z.string().min(1),
	interval: z.string().optional(),
	expires_in: z.number().optional(),
	expires_at: z.string().optional(),
});

const deviceTokenResponseSchema = z.object({
	authorization_code: z.string().min(1),
	code_verifier: z.string().min(1),
});

const tokenResponseSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().optional(),
	id_token: z.string().optional(),
	expires_in: z.number().optional(),
	token_type: z.string().optional(),
});

class OpenAiDeviceCompleteDto extends Z.class({
	id: z.string().min(1),
	deviceAuthId: z.string().min(1),
	userCode: z.string().min(1),
}) {}

type OpenAiDeviceChallenge = {
	deviceAuthId: string;
	userCode: string;
	verificationUri: string;
	intervalMs: number;
	expiresAt: number;
};

type OpenAiDeviceAuthRequest = AuthenticatedRequest<{}, {}, {}, { id?: string }>;

@RestController('/openai-oauth2-credential')
export class OpenAiOAuth2DeviceController {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly oauthService: OauthService,
	) {}

	@Get('/device-auth')
	async renderDeviceAuthPage(req: OpenAiDeviceAuthRequest, res: ExpressResponse) {
		const credentialId = String(req.query.id ?? '');
		await this.getOpenAiCredentialForUpdate(req, credentialId);

		const challenge = await this.requestDeviceChallenge();
		return res.type('html').send(this.renderDevicePage(credentialId, challenge));
	}

	@Post('/device-complete')
	async completeDeviceAuth(
		req: AuthenticatedRequest,
		_res: ExpressResponse,
		@Body payload: OpenAiDeviceCompleteDto,
	) {
		const { id, deviceAuthId, userCode } = payload;
		const credential = await this.getOpenAiCredentialForUpdate(req, id);

		const deviceTokenResponse = await fetch(OPENAI_DEVICE_TOKEN_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				device_auth_id: deviceAuthId,
				user_code: userCode,
			}),
		});

		if (deviceTokenResponse.status === 403 || deviceTokenResponse.status === 404) {
			return { status: 'pending' };
		}

		if (!deviceTokenResponse.ok) {
			throw new BadRequestError(
				await this.getOpenAiErrorMessage(deviceTokenResponse, 'OpenAI device login failed'),
			);
		}

		const deviceTokenPayload: unknown = await deviceTokenResponse.json();
		const deviceToken = deviceTokenResponseSchema.parse(deviceTokenPayload);
		const tokenData = await this.exchangeDeviceAuthorizationCode(deviceToken);

		await this.oauthService.encryptAndSaveData(credential, { oauthTokenData: tokenData }, [
			'csrfSecret',
			'codeVerifier',
		]);

		return { status: 'success' };
	}

	private async getOpenAiCredentialForUpdate(req: AuthenticatedRequest, credentialId: string) {
		if (!credentialId) {
			throw new BadRequestError('Required credential ID is missing');
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:update'],
		);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		if (credential.type !== OPENAI_OAUTH2_CREDENTIAL_TYPE) {
			throw new BadRequestError('Credential type not supported');
		}

		return credential;
	}

	private async requestDeviceChallenge(): Promise<OpenAiDeviceChallenge> {
		const response = await fetch(OPENAI_DEVICE_AUTHORIZATION_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ client_id: OPENAI_CODEX_CLIENT_ID }),
		});

		if (!response.ok) {
			throw new BadRequestError(
				await this.getOpenAiErrorMessage(response, 'OpenAI device login failed'),
			);
		}

		const payload: unknown = await response.json();
		const device = deviceAuthorizationResponseSchema.parse(payload);
		const intervalSeconds = Number.parseInt(device.interval ?? '5', 10);
		const expiresAt = device.expires_at
			? Date.parse(device.expires_at)
			: Date.now() + (device.expires_in ?? 600) * 1000;

		return {
			verificationUri: OPENAI_DEVICE_VERIFICATION_URI,
			userCode: device.user_code,
			deviceAuthId: device.device_auth_id,
			intervalMs: Math.max(Number.isFinite(intervalSeconds) ? intervalSeconds : 5, 1) * 1000,
			expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 600 * 1000,
		};
	}

	private async exchangeDeviceAuthorizationCode(deviceToken: {
		authorization_code: string;
		code_verifier: string;
	}): Promise<ICredentialDataDecryptedObject> {
		const body = new URLSearchParams();
		body.set('grant_type', 'authorization_code');
		body.set('code', deviceToken.authorization_code);
		body.set('redirect_uri', OPENAI_DEVICE_REDIRECT_URI);
		body.set('client_id', OPENAI_CODEX_CLIENT_ID);
		body.set('code_verifier', deviceToken.code_verifier);

		const tokenResponse = await fetch(OPENAI_TOKEN_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		});

		if (!tokenResponse.ok) {
			throw new BadRequestError(
				await this.getOpenAiErrorMessage(tokenResponse, 'OpenAI token exchange failed'),
			);
		}

		const tokenPayload: unknown = await tokenResponse.json();
		const tokenResponseData = tokenResponseSchema.parse(tokenPayload);
		const tokenData: ICredentialDataDecryptedObject = {};

		for (const [key, value] of Object.entries(tokenResponseData)) {
			if (value !== undefined) {
				tokenData[key] = value;
			}
		}

		return tokenData;
	}

	private async getOpenAiErrorMessage(response: Response, fallback: string) {
		try {
			const payload: unknown = await response.json();
			const parsed = z
				.object({
					error: z.string().optional(),
					error_description: z.string().optional(),
					message: z.string().optional(),
				})
				.safeParse(payload);

			if (parsed.success) {
				return (
					parsed.data.error_description ??
					parsed.data.message ??
					parsed.data.error ??
					`${fallback}: HTTP ${response.status}`
				);
			}
		} catch {}

		return `${fallback}: HTTP ${response.status}`;
	}

	private renderDevicePage(credentialId: string, challenge: OpenAiDeviceChallenge) {
		const challengeJson = stringifyForInlineScript({ credentialId, ...challenge });

		return `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>OpenAI OAuth2 Device Login</title>
		<style>
			body {
				box-sizing: border-box;
				display: flex;
				min-height: 100vh;
				margin: 0;
				padding: 32px;
				align-items: center;
				justify-content: center;
				background: #f6f7f8;
				color: #1d1f21;
				font-family: Inter, Arial, sans-serif;
			}
			main {
				width: min(480px, 100%);
				background: #fff;
				border: 1px solid #d9dee3;
				border-radius: 8px;
				padding: 28px;
			}
			h1 {
				margin: 0 0 16px;
				font-size: 20px;
				font-weight: 600;
			}
			p {
				margin: 12px 0;
				line-height: 1.5;
			}
			.code {
				margin: 20px 0;
				padding: 18px;
				border: 1px solid #c9d1d9;
				border-radius: 6px;
				background: #f3f5f7;
				font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
				font-size: 28px;
				font-weight: 700;
				text-align: center;
				letter-spacing: 2px;
			}
			.primary-action {
				display: flex;
				margin: 20px 0 8px;
			}
			.primary-action a {
				display: inline-flex;
				width: 100%;
				min-height: 44px;
				align-items: center;
				justify-content: center;
				border-radius: 6px;
				background: #ff6d5a;
				color: #fff;
				font-size: 15px;
				font-weight: 700;
				text-decoration: none;
			}
			.primary-action a:focus {
				outline: 2px solid #ff9a8d;
				outline-offset: 2px;
			}
			button {
				display: inline-flex;
				margin-top: 8px;
				padding: 6px 0;
				border: 0;
				border-radius: 4px;
				background: transparent;
				color: #5f6b7a;
				font-size: 13px;
				font-weight: 500;
				text-decoration: underline;
				cursor: pointer;
			}
			button:disabled {
				cursor: default;
				opacity: 0.65;
			}
			.status {
				margin-top: 18px;
				color: #5f6b7a;
				font-size: 14px;
			}
		</style>
	</head>
	<body>
		<main>
			<h1>Connect OpenAI Account (ChatGPT)</h1>
			<p>Open the OpenAI device login page and enter this code:</p>
			<div class="code" id="user-code"></div>
			<div class="primary-action">
				<a id="verification-link" href="#" target="_blank" rel="noopener">Open OpenAI device login</a>
			</div>
			<button id="continue-button" type="button">Continue after authorization</button>
			<p class="status" id="status">Waiting for you to finish authorization in OpenAI.</p>
		</main>
		<script>
			const challenge = ${challengeJson};
			const userCode = document.getElementById('user-code');
			const verificationLink = document.getElementById('verification-link');
			const continueButton = document.getElementById('continue-button');
			const status = document.getElementById('status');
			userCode.textContent = challenge.userCode;
			verificationLink.href = challenge.verificationUri;

			const channel = new BroadcastChannel('oauth-callback');
			let pollTimeout;
			function getBrowserId() {
				const storageKey = 'n8n-browserId';
				let browserId = localStorage.getItem(storageKey);
				if (!browserId) {
					browserId = crypto.randomUUID();
					localStorage.setItem(storageKey, browserId);
				}
				return browserId;
			}

			function schedulePoll(delayMs) {
				clearTimeout(pollTimeout);
				pollTimeout = setTimeout(poll, delayMs);
			}

			async function poll() {
				if (Date.now() > challenge.expiresAt) {
					status.textContent = 'The device code expired. Close this window and reconnect.';
					channel.postMessage('error');
					channel.close();
					return;
				}

				try {
					const response = await fetch('./device-complete', {
						method: 'POST',
						credentials: 'same-origin',
						headers: {
							'Content-Type': 'application/json',
							'browser-id': getBrowserId(),
						},
						body: JSON.stringify({
							id: challenge.credentialId,
							deviceAuthId: challenge.deviceAuthId,
							userCode: challenge.userCode,
						}),
					});
					const responseText = await response.text();
					let result = {};
					try {
						result = responseText ? JSON.parse(responseText) : {};
					} catch (error) {
						status.textContent = 'Connection failed: HTTP ' + response.status + ' ' + responseText;
						channel.postMessage('error');
						channel.close();
						continueButton.disabled = false;
						return;
					}
					const payload = result.data ?? result;

					if (response.ok && payload.status === 'success') {
						status.textContent = 'Connection successful. This window will close automatically.';
						channel.postMessage('success');
						channel.close();
						setTimeout(() => window.close(), 1500);
						return;
					}

					if (response.ok && payload.status === 'pending') {
						status.textContent = 'Waiting for OpenAI authorization to complete...';
						schedulePoll(challenge.intervalMs);
						return;
					}

					status.textContent =
						payload.message ??
						payload.error?.message ??
						'Connection failed: HTTP ' + response.status + ' ' + responseText;
					channel.postMessage('error');
					channel.close();
					continueButton.disabled = false;
				} catch (error) {
					status.textContent =
						'Connection failed: ' + (error instanceof Error ? error.message : String(error));
					channel.postMessage('error');
					channel.close();
					continueButton.disabled = false;
				}
			}

			verificationLink.addEventListener('click', () => {
				continueButton.disabled = true;
				status.textContent = 'Waiting for OpenAI authorization to complete...';
				schedulePoll(challenge.intervalMs);
			});

			continueButton.addEventListener('click', () => {
				continueButton.disabled = true;
				status.textContent = 'Checking authorization...';
				void poll();
			});
		</script>
	</body>
</html>`;
	}
}

function stringifyForInlineScript(value: unknown): string {
	return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
		switch (character) {
			case '<':
				return '\\u003c';
			case '>':
				return '\\u003e';
			case '&':
				return '\\u0026';
			case '\u2028':
				return '\\u2028';
			case '\u2029':
				return '\\u2029';
			default:
				return character;
		}
	});
}
