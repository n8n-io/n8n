import type {
	ICredentialType,
	ICredentialsExpressionResolveValues,
	IHttpRequestHelper,
	INode,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { prepareCredentialData, preAuthenticateCredential } from '../credential-operations';

const node: INode = {
	id: 'request',
	name: 'Request',
	type: 'test.request',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function resolution(): ICredentialsExpressionResolveValues {
	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: mock<INodeTypes>(),
	});
	return {
		workflow,
		node,
		runExecutionData: createRunExecutionData(),
		runIndex: 0,
		itemIndex: 0,
		connectionInputData: [{ json: { region: 'eu' } }],
	};
}

test('applies the type endpoint and instance values before resolving credential fields', async () => {
	const data = await prepareCredentialData({
		credentialType: mock<ICredentialType>(),
		properties: [
			{ displayName: 'URL', name: 'authUrl', type: 'hidden', default: 'https://auth.example.com' },
			{ displayName: 'Region', name: 'region', type: 'string', default: 'us' },
			{ displayName: 'Value', name: 'value', type: 'string', default: '={{ $self.region }}' },
		],
		data: { authUrl: 'https://old.example.com', region: '' },
		applyOverwrite: (data) => ({ ...data, region: 'eu' }),
		additionalData: mock<IWorkflowExecuteAdditionalData>(),
		mode: 'trigger',
		expressionResolveValues: resolution(),
	});

	expect(data).toEqual({ authUrl: 'https://auth.example.com', region: 'eu', value: 'eu' });
});

test('resolves opted-in JSON leaves and preserves credential HTTP domain restrictions', async () => {
	const data = await prepareCredentialData({
		credentialType: mock<ICredentialType>(),
		properties: [
			{
				displayName: 'Claims',
				name: 'claims',
				type: 'string',
				default: '',
				typeOptions: { resolveCredentialJsonLeaves: true },
			},
		],
		data: {
			claims: '{"region":"={{ $json.region }}"}',
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'api.example.com',
		},
		applyOverwrite: (data) => data,
		additionalData: mock<IWorkflowExecuteAdditionalData>(),
		mode: 'trigger',
		expressionResolveValues: resolution(),
	});

	expect(data).toEqual({
		claims: '{"region":"eu"}',
		allowedHttpRequestDomains: 'domains',
		allowedDomains: 'api.example.com',
	});
});

test('waits for pre-authentication before making the refreshed value available', async () => {
	let finish!: (value: { token: string }) => void;
	const credentialType = mock<ICredentialType>({
		properties: [
			{
				displayName: 'Token',
				name: 'token',
				type: 'hidden',
				default: '',
				typeOptions: { expirable: true },
			},
		],
		preAuthentication: async () =>
			await new Promise<{ token: string }>((resolve) => {
				finish = resolve;
			}),
	});
	let completed = false;
	const refreshed = preAuthenticateCredential({
		credentialType,
		helpers: mock<IHttpRequestHelper>(),
		credentials: { token: '' },
		node,
		credentialsExpired: false,
	}).then((result) => {
		completed = true;
		return result;
	});
	await Promise.resolve();
	expect(completed).toBe(false);
	finish({ token: 'fresh' });
	expect(await refreshed).toEqual({ data: { token: 'fresh' }, property: 'token' });
});
