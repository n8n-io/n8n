import { mock } from 'vitest-mock-extended';
import type {
	ICredentialsHelper,
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
		expect(credentials.accessToken).not.toBe('xoxb-real-token');
		expect(credentials.region).toBe('eu');
		expect(credentials.oauthTokenData).toBeDefined();
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
