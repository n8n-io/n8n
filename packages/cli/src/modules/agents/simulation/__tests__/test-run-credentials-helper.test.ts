import { mock } from 'vitest-mock-extended';
import type {
	ICredentialsHelper,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { TestRunCredentialsHelper } from '../test-run-credentials-helper';

const slackProperties: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
	},
	{ displayName: 'Region', name: 'region', type: 'string', default: 'eu' },
];

function setup() {
	const inner = mock<ICredentialsHelper>();
	inner.getCredentialsProperties.mockReturnValue(slackProperties);
	inner.getDecrypted.mockResolvedValue({ accessToken: 'xoxb-real-token' });
	return { inner, helper: new TestRunCredentialsHelper(inner) };
}

describe('TestRunCredentialsHelper', () => {
	it('builds credentials from the type with placeholder secrets and never decrypts', async () => {
		const { inner, helper } = setup();

		const credentials = await helper.getDecrypted(
			mock<IWorkflowExecuteAdditionalData>(),
			{ id: 'cred-1', name: 'Slack' },
			'slackApi',
			'manual',
		);

		expect(inner.getDecrypted).not.toHaveBeenCalled();
		expect(credentials.accessToken).toBe('<access-token>');
		expect(credentials.region).toBe('eu');
		expect(credentials.oauthTokenData).toBeDefined();
	});

	it('skips auth and pre-auth, so no real token is fetched or applied', async () => {
		const { inner, helper } = setup();
		const options: IHttpRequestOptions = { url: 'https://slack.com/api/chat.postMessage' };
		const credentials = { accessToken: 'placeholder' };

		await expect(helper.authenticate(credentials, 'slackApi', options)).resolves.toBe(options);
		await expect(
			helper.preAuthentication(
				mock<IHttpRequestHelper>(),
				credentials,
				'slackApi',
				mock<INode>(),
				true,
			),
		).resolves.toBe(credentials);
		await expect(
			helper.runPreAuthentication(mock<IHttpRequestHelper>(), credentials),
		).resolves.toBe(credentials);

		expect(inner.authenticate).not.toHaveBeenCalled();
		expect(inner.preAuthentication).not.toHaveBeenCalled();
		expect(inner.runPreAuthentication).not.toHaveBeenCalled();
	});

	it('answers credential type questions from the real helper', () => {
		const { inner, helper } = setup();
		inner.getParentTypes.mockReturnValue(['oAuth2Api']);
		inner.isCredentialUsableByNode.mockReturnValue(true);

		expect(helper.getParentTypes('slackOAuth2Api')).toEqual(['oAuth2Api']);
		expect(helper.isCredentialUsableByNode('slackApi', 'n8n-nodes-base.slack')).toBe(true);
		expect(helper.getCredentialsProperties('slackApi')).toBe(slackProperties);
	});

	it('never writes a credential back', async () => {
		const { inner, helper } = setup();

		await helper.updateCredentials();
		await helper.updateCredentialsOauthTokenData();

		expect(inner.updateCredentials).not.toHaveBeenCalled();
		expect(inner.updateCredentialsOauthTokenData).not.toHaveBeenCalled();
	});

	it('refuses to read stored credentials', async () => {
		const { helper } = setup();

		await expect(helper.getCredentials()).rejects.toThrow('does not read stored credentials');
	});
});
