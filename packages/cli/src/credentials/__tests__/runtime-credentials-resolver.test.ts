import type { RuntimeCredentialProxyService } from '@n8n/backend-services';
import { UserError } from '@n8n/errors';
import type { ICredentialType, IExecutionContext, INode } from 'n8n-workflow';
import { ExpressionError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import {
	buildRuntimeCredentialsProxy,
	RuntimeCredentialsResolver,
	type RuntimeCredentialsRequest,
} from '../runtime-credentials-resolver';

const headerAuth = mock<ICredentialType>({
	name: 'httpHeaderAuth',
	properties: [],
	preAuthentication: undefined,
});
const expiringType = mock<ICredentialType>({
	name: 'sessionAuth',
	properties: [{ name: 'token', type: 'hidden', default: '', typeOptions: { expirable: true } }],
	preAuthentication: undefined,
});

const executionContext = mock<IExecutionContext>();
const httpNode = mock<INode>({ type: 'n8n-nodes-base.httpRequest' });

const request = (
	overrides: Partial<RuntimeCredentialsRequest> = {},
): RuntimeCredentialsRequest => ({
	credential: { id: 'cred-1', name: 'Tenant key', type: 'httpHeaderAuth', isGlobal: true },
	data: {
		name: 'x-api-key',
		value: '={{ $runtimeCredentials.tenant_key }}',
		allowedHttpRequestDomains: 'domains',
		allowedDomains: 'api.partner.test',
	},
	consumerNode: httpNode,
	executionContext,
	...overrides,
});

describe('RuntimeCredentialsResolver', () => {
	const proxyService = mock<RuntimeCredentialProxyService>();
	const credentialTypes = mock<CredentialTypes>();
	const resolver = new RuntimeCredentialsResolver(proxyService, credentialTypes);

	beforeEach(() => {
		vi.resetAllMocks();
		proxyService.isEnabled.mockReturnValue(true);
		proxyService.getRuntimeCredentials.mockResolvedValue({ tenant_key: ['sk_acme_123'] });
		credentialTypes.getParentTypes.mockReturnValue([]);
		credentialTypes.getByName.mockImplementation((name) =>
			name === 'sessionAuth' ? expiringType : headerAuth,
		);
	});

	it('returns undefined and does not decrypt when the credential does not refer to runtime values', async () => {
		const result = await resolver.resolve(
			request({
				data: { name: 'x-api-key', value: 'static' },
				credential: { id: '1', name: 'n', type: 'httpHeaderAuth', isGlobal: false },
			}),
		);

		expect(result).toBeUndefined();
		expect(proxyService.getRuntimeCredentials).not.toHaveBeenCalled();
	});

	it('returns a proxy with the value of the execution', async () => {
		const result = await resolver.resolve(request());

		expect(result?.tenant_key).toBe('sk_acme_123');
		expect(proxyService.getRuntimeCredentials).toHaveBeenCalledWith(executionContext);
	});

	it.each<[string, Partial<RuntimeCredentialsRequest>, RegExp]>([
		[
			'a credential that is not global',
			{ credential: { id: '1', name: 'n', type: 'httpHeaderAuth', isGlobal: false } },
			/available to all users/,
		],
		[
			'a credential without a domain restriction',
			{
				data: { value: '={{ $runtimeCredentials.tenant_key }}', allowedHttpRequestDomains: 'all' },
			},
			/specific domains/,
		],
		[
			'a credential with an empty domain list',
			{
				data: {
					value: '={{ $runtimeCredentials.tenant_key }}',
					allowedHttpRequestDomains: 'domains',
					allowedDomains: ' ',
				},
			},
			/specific domains/,
		],
		[
			'a node that does not enforce the domain restriction',
			{ consumerNode: mock<INode>({ type: '@n8n/n8n-nodes-langchain.mcpClientTool' }) },
			/HTTP Request and GraphQL/,
		],
		['a call without a consumer node', { consumerNode: undefined }, /HTTP Request and GraphQL/],
		[
			'a type that stores tokens',
			{ credential: { id: '1', name: 'n', type: 'sessionAuth', isGlobal: true } },
			/stores tokens/,
		],
	])('rejects %s', async (_name, overrides, message) => {
		await expect(resolver.resolve(request(overrides))).rejects.toThrow(message);
		expect(proxyService.getRuntimeCredentials).not.toHaveBeenCalled();
	});

	it('rejects OAuth types', async () => {
		credentialTypes.getParentTypes.mockReturnValue(['oAuth2Api']);

		await expect(resolver.resolve(request())).rejects.toThrow(/stores tokens/);
	});

	it('rejects the credential when runtime credentials are disabled', async () => {
		proxyService.isEnabled.mockReturnValue(false);

		await expect(resolver.resolve(request())).rejects.toThrow(UserError);
	});
});

describe('buildRuntimeCredentialsProxy', () => {
	it('can be awaited and serialized without throwing', async () => {
		const proxy = buildRuntimeCredentialsProxy({ tenant_key: ['sk_1'] });

		await expect(Promise.resolve(proxy)).resolves.toBe(proxy);
		expect(() => JSON.stringify(proxy)).not.toThrow();
	});

	it('unwraps repeated identical values', () => {
		const proxy = buildRuntimeCredentialsProxy({ tenant_key: ['sk_1', 'sk_1'] });

		expect(proxy.tenant_key).toBe('sk_1');
	});

	it.each([
		['an unknown alias', {}, 'tenant_key', /No runtime credential/],
		['an empty list', { tenant_key: [] }, 'tenant_key', /No runtime credential/],
		['different values', { tenant_key: ['sk_1', 'sk_2'] }, 'tenant_key', /different values/],
		['an object value', { tenant_key: [{ nested: true }] }, 'tenant_key', /not a text/],
	])('throws an ExpressionError for %s', (_name, values, alias, message) => {
		const proxy = buildRuntimeCredentialsProxy(values);

		// The engines swallow other error types, so the type is part of the contract.
		expect(() => proxy[alias]).toThrow(ExpressionError);
		expect(() => proxy[alias]).toThrow(message);
	});
});
