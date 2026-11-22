import type { Tenant } from '@n8n/ai-gym';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { SimulationCredentialsHelper } from '../simulation-credentials-helper';

function makeInnerHelper(
	decrypted: ICredentialDataDecryptedObject | Error,
	properties: Array<{ name: string }> = [{ name: 'accessToken' }, { name: 'notice' }],
) {
	return {
		getParentTypes: vi.fn().mockReturnValue([]),
		getCredentialsProperties: vi.fn().mockReturnValue(properties),
		isCredentialUsableByNode: vi.fn().mockReturnValue(true),
		updateCredentials: vi.fn(),
		updateCredentialsOauthTokenData: vi.fn(),
		authenticate: vi.fn(),
		preAuthentication: vi.fn(),
		runPreAuthentication: vi.fn(),
		getCredentials: vi.fn(),
		getDecrypted:
			decrypted instanceof Error
				? vi.fn().mockRejectedValue(decrypted)
				: vi.fn().mockResolvedValue(decrypted),
	} as unknown as ICredentialsHelper;
}

describe('SimulationCredentialsHelper', () => {
	it('synthesizes tenant-minted credentials when a node has no configured credential', async () => {
		const inner = makeInnerHelper(new Error('should not be called for null id'), [
			{ name: 'accessToken' },
			{ name: 'notice' },
		]);
		const tenant = {
			mintCredential: vi.fn().mockResolvedValue({ token: 'xoxb-aigym-minted-token' }),
		} as unknown as Tenant;

		const helper = new SimulationCredentialsHelper(inner, tenant);

		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: null, name: 'slackApi' },
			'slackApi',
			'manual',
		);

		expect(inner.getDecrypted).not.toHaveBeenCalled();
		expect(tenant.mintCredential).toHaveBeenCalledWith('slack');
		expect(result.accessToken).toBe('xoxb-aigym-minted-token');
	});

	it('falls back to tenant-minted credentials if a configured credential cannot be decrypted', async () => {
		const inner = makeInnerHelper(new Error('Credential "slackApi" is missing'));
		const tenant = {
			mintCredential: vi.fn().mockResolvedValue({ token: 'xoxb-aigym-fallback' }),
		} as unknown as Tenant;

		const helper = new SimulationCredentialsHelper(inner, tenant);

		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: 'cred-1', name: 'Slack' },
			'slackApi',
			'manual',
		);

		expect(inner.getDecrypted).toHaveBeenCalledTimes(1);
		expect(tenant.mintCredential).toHaveBeenCalledWith('slack');
		expect(result.accessToken).toBe('xoxb-aigym-fallback');
	});

	it('synthesizes OAuth2 credentials without a configured credential', async () => {
		const inner = makeInnerHelper({}, [
			{ name: 'clientId' },
			{ name: 'clientSecret' },
			{ name: 'oauthTokenData' },
		]);
		const tenant = {
			mintCredential: vi.fn().mockResolvedValue({
				token: 'ya29.aigym-minted',
				refresh_token: '1//aigym-refresh',
				client_id: 'gym-client',
				client_secret: 'gym-secret',
			}),
		} as unknown as Tenant;

		const helper = new SimulationCredentialsHelper(inner, tenant);
		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: null, name: 'gmailOAuth2' },
			'gmailOAuth2',
			'manual',
		);

		expect(result.oauthTokenData).toMatchObject({
			access_token: 'ya29.aigym-minted',
			refresh_token: '1//aigym-refresh',
			token_type: 'Bearer',
		});
		expect(result.clientId).toBe('gym-client');
		expect(result.clientSecret).toBe('gym-secret');
	});

	it('maps a real configured credential secret to the ai-gym tenant token while preserving non-secret fields', async () => {
		const inner = makeInnerHelper(
			{
				accessToken: 'xoxb-real-user-secret',
				customBaseUrl: 'https://slack.com',
			},
			[{ name: 'accessToken' }, { name: 'customBaseUrl' }],
		);
		const tenant = {
			mintCredential: vi.fn().mockResolvedValue({ token: 'xoxb-aigym-minted-token' }),
		} as unknown as Tenant;

		const helper = new SimulationCredentialsHelper(inner, tenant);

		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: 'cred-1', name: 'Slack' },
			'slackApi',
			'manual',
		);

		expect(inner.getDecrypted).toHaveBeenCalledTimes(1);
		expect(tenant.mintCredential).toHaveBeenCalledWith('slack');
		expect(result.accessToken).toBe('xoxb-aigym-minted-token');
		expect(result.customBaseUrl).toBe('https://slack.com');
	});

	it('maps OAuth2 credentials by replacing oauthTokenData access/refresh tokens with the tenant tokens', async () => {
		const inner = makeInnerHelper(
			{
				clientId: 'real-client-id',
				clientSecret: 'real-client-secret',
				oauthTokenData: {
					access_token: 'real-google-token',
					refresh_token: 'real-google-refresh',
					token_type: 'Bearer',
				},
			},
			[{ name: 'clientId' }, { name: 'clientSecret' }, { name: 'oauthTokenData' }],
		);
		const tenant = {
			mintCredential: vi.fn().mockResolvedValue({
				token: 'ya29.aigym-minted',
				refresh_token: '1//aigym-refresh',
				client_id: 'gym-client',
				client_secret: 'gym-secret',
			}),
		} as unknown as Tenant;

		const helper = new SimulationCredentialsHelper(inner, tenant);
		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: 'cred-2', name: 'Gmail' },
			'gmailOAuth2',
			'manual',
		);

		expect(result.oauthTokenData).toMatchObject({
			access_token: 'ya29.aigym-minted',
			refresh_token: '1//aigym-refresh',
			token_type: 'Bearer',
		});
		expect(result.clientId).toBe('gym-client');
		expect(result.clientSecret).toBe('gym-secret');
	});
});
