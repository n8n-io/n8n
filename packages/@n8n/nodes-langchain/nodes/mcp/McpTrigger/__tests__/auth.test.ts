import { Container } from '@n8n/di';
import { WebhookAuthorizationError } from 'n8n-nodes-base/dist/nodes/Webhook/error';
import type { IWebhookFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { buildWwwAuthenticateHeader, verifyN8nOAuth2 } from '../auth';

const RESOURCE_METADATA_URL =
	'https://example.test/.well-known/oauth-protected-resource/mcp-server/http';

describe('verifyN8nOAuth2', () => {
	let verifyAccessToken: Mock;
	let getProtectedResourceMetadataUrl: Mock;

	beforeEach(() => {
		verifyAccessToken = vi.fn();
		getProtectedResourceMetadataUrl = vi.fn().mockReturnValue(RESOURCE_METADATA_URL);
		vi.mocked(Container.get).mockReturnValue({
			verifyAccessToken,
			getProtectedResourceMetadataUrl,
		} as never);
	});

	function makeContext(headers: Record<string, string>): IWebhookFunctions {
		return mock<IWebhookFunctions>({
			getRequestObject: vi.fn().mockReturnValue({ headers } as never),
		});
	}

	it('throws WebhookAuthorizationError(401) when Authorization header is missing', async () => {
		const ctx = makeContext({});

		await expect(verifyN8nOAuth2(ctx)).rejects.toMatchObject({
			constructor: WebhookAuthorizationError,
			responseCode: 401,
			message: 'Bearer token required',
		});
		expect(verifyAccessToken).not.toHaveBeenCalled();
	});

	it('throws WebhookAuthorizationError(401) when Authorization header lacks Bearer prefix', async () => {
		const ctx = makeContext({ authorization: 'Basic dXNlcjpwYXNz' });

		await expect(verifyN8nOAuth2(ctx)).rejects.toMatchObject({
			responseCode: 401,
		});
		expect(verifyAccessToken).not.toHaveBeenCalled();
	});

	it('throws WebhookAuthorizationError(403) when the verifier rejects', async () => {
		const ctx = makeContext({ authorization: 'Bearer bogus' });
		verifyAccessToken.mockRejectedValue(new Error('jwt invalid'));

		await expect(verifyN8nOAuth2(ctx)).rejects.toMatchObject({
			responseCode: 403,
			message: 'Invalid or expired token',
		});
		expect(verifyAccessToken).toHaveBeenCalledWith('bogus');
	});

	it('resolves when the verifier accepts the token', async () => {
		const ctx = makeContext({ authorization: 'Bearer valid-token' });
		verifyAccessToken.mockResolvedValue(undefined);

		await expect(verifyN8nOAuth2(ctx)).resolves.toBeUndefined();
		expect(verifyAccessToken).toHaveBeenCalledWith('valid-token');
	});

	it('trims whitespace from the token', async () => {
		const ctx = makeContext({ authorization: 'Bearer   spaced-token   ' });
		verifyAccessToken.mockResolvedValue(undefined);

		await verifyN8nOAuth2(ctx);

		expect(verifyAccessToken).toHaveBeenCalledWith('spaced-token');
	});
});

describe('buildWwwAuthenticateHeader', () => {
	it('builds the RFC 6750 challenge with realm and resource_metadata', () => {
		const header = buildWwwAuthenticateHeader(RESOURCE_METADATA_URL);
		expect(header).toBe(
			`Bearer realm="n8n MCP Trigger", resource_metadata="${RESOURCE_METADATA_URL}"`,
		);
	});
});
