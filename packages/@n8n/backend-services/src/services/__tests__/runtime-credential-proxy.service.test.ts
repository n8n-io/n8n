import type { IRunExecutionData } from 'n8n-workflow';

import {
	RuntimeCredentialProxyService,
	type RuntimeCredentialProvider,
} from '../runtime-credential-proxy.service';

const runExecutionData = {} as IRunExecutionData;

const makeProvider = (
	overrides: Partial<RuntimeCredentialProvider> = {},
): RuntimeCredentialProvider => ({
	getRuntimeCredential: vi.fn(),
	getRuntimeCredentialData: vi.fn(),
	hasCredentialRuleForTrigger: vi.fn().mockReturnValue(false),
	getRuntimeCredentialValues: vi.fn().mockResolvedValue([]),
	getRuleAliasForStub: vi.fn(),
	getAllowedDomainsForStub: vi.fn(),
	...overrides,
});

describe('RuntimeCredentialProxyService', () => {
	let service: RuntimeCredentialProxyService;

	beforeEach(() => {
		service = new RuntimeCredentialProxyService();
	});

	it('returns undefined when no provider is registered', async () => {
		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBeUndefined();
	});

	it('forwards arguments to the registered provider and returns its result', async () => {
		const provider = makeProvider({
			getRuntimeCredential: vi.fn().mockResolvedValue('Bearer xyz'),
		});
		service.registerProvider(provider);

		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBe('Bearer xyz');
		expect(provider.getRuntimeCredential).toHaveBeenCalledWith(runExecutionData, 'api_key');
	});

	it('uses the last-registered provider when registerProvider is called multiple times', async () => {
		const providerA = makeProvider({ getRuntimeCredential: vi.fn().mockResolvedValue('from-a') });
		const providerB = makeProvider({ getRuntimeCredential: vi.fn().mockResolvedValue('from-b') });

		service.registerProvider(providerA);
		service.registerProvider(providerB);

		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBe('from-b');
		expect(providerA.getRuntimeCredential).not.toHaveBeenCalled();
		expect(providerB.getRuntimeCredential).toHaveBeenCalledTimes(1);
	});

	it('throws on getRuntimeCredentialData when no provider is registered', async () => {
		await expect(
			service.getRuntimeCredentialData(undefined, 'stub-id', 'gmailOAuth2'),
		).rejects.toThrow('Run-time credentials are not enabled');
	});

	it('forwards getRuntimeCredentialData to the provider', async () => {
		const data = { oauthTokenData: { access_token: 'abc' } };
		const provider = makeProvider({ getRuntimeCredentialData: vi.fn().mockResolvedValue(data) });
		service.registerProvider(provider);

		await expect(
			service.getRuntimeCredentialData(undefined, 'stub-id', 'gmailOAuth2'),
		).resolves.toEqual(data);
		expect(provider.getRuntimeCredentialData).toHaveBeenCalledWith(
			undefined,
			'stub-id',
			'gmailOAuth2',
		);
	});

	it('reports no credential rule when no provider is registered', () => {
		expect(service.hasCredentialRuleForTrigger('stub-id', 'n8n-nodes-base.webhook')).toBe(false);
	});

	it('forwards hasCredentialRuleForTrigger to the provider', () => {
		service.registerProvider(
			makeProvider({ hasCredentialRuleForTrigger: vi.fn().mockReturnValue(true) }),
		);
		expect(service.hasCredentialRuleForTrigger('stub-id', 'n8n-nodes-base.webhook')).toBe(true);
	});

	it('returns no values and no alias when no provider is registered', async () => {
		await expect(service.getRuntimeCredentialValues({} as never)).resolves.toEqual([]);
		expect(service.getRuleAliasForStub('stub-id')).toBeUndefined();
	});

	it('forwards the values and the alias lookup to the provider', async () => {
		const values = [{ alias: 'a', value: 'secret-1' }];
		const provider = makeProvider({
			getRuntimeCredentialValues: vi.fn().mockResolvedValue(values),
			getRuleAliasForStub: vi.fn().mockReturnValue('a'),
		});
		service.registerProvider(provider);

		await expect(service.getRuntimeCredentialValues({} as never)).resolves.toEqual(values);
		expect(service.getRuleAliasForStub('stub-id')).toBe('a');
	});
});
