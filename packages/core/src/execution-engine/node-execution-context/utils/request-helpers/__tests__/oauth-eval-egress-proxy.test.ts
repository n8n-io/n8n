import type { IAllExecuteFunctions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { refreshOAuth2Token, requestOAuth2 } from '../oauth';

const clientOptions = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('@n8n/client-oauth2', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/client-oauth2')>();
	class RecordingClient extends actual.ClientOAuth2 {
		constructor(options: ConstructorParameters<typeof actual.ClientOAuth2>[0]) {
			clientOptions.push(options as unknown as Record<string, unknown>);
			super(options);
		}
	}
	return { ...actual, ClientOAuth2: RecordingClient };
});

describe('OAuth2 token client in a simulated-services eval run', () => {
	const proxy = 'http://127.0.0.1:4567';
	const node = mockDeep<INode>();
	const additionalData = mockDeep<IWorkflowExecuteAdditionalData>();
	(additionalData as unknown as Record<string, unknown>)['oauth-jwe'] = undefined;
	additionalData.ssrfBridge = undefined;
	additionalData.evalEgressProxy = proxy;
	const credentials = {
		clientId: 'id',
		clientSecret: 'secret',
		grantType: 'authorizationCode',
		authUrl: 'https://example.com/auth',
		accessTokenUrl: 'https://example.com/token',
		authentication: 'body',
		scope: '',
		oauthTokenData: { access_token: 'old', refresh_token: 'refresh' },
	};

	beforeEach(() => {
		clientOptions.length = 0;
		node.credentials = { oAuth2Api: { id: 'cred-1', name: 'OAuth2' } };
	});

	it.each([
		[
			'refreshOAuth2Token',
			async (that: IAllExecuteFunctions) =>
				await refreshOAuth2Token.call(that, 'oAuth2Api', node, additionalData),
		],
		[
			'requestOAuth2',
			async (that: IAllExecuteFunctions) =>
				await requestOAuth2.call(
					that,
					'oAuth2Api',
					{ url: 'https://example.com/api', method: 'GET' },
					node,
					additionalData,
				),
		],
	])('%s creates the token client with the run proxy', async (_name, call) => {
		const that = mockDeep<IAllExecuteFunctions>();
		that.getCredentials.mockResolvedValue(structuredClone(credentials));

		// The proxy does not listen: only the client's options matter here.
		await call(that).catch(() => {});

		expect(clientOptions[0]?.proxy).toBe(proxy);
	});
});
