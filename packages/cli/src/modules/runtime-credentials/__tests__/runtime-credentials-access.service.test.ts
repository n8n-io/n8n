import type { Cipher } from 'n8n-core';
import type { IExecutionContext, IRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialFieldTargetValidator } from '../credential-field-target';
import { RuntimeCredentialsAccessService } from '../runtime-credentials-access.service';
import type { ValueLookupPath } from '../runtime-credentials.schemas';
import type { RuntimeCredentialsService } from '../runtime-credentials.service';

const ENCRYPTED_BLOB = 'encrypted-blob-placeholder';

const buildRunExecutionData = (secureArtifacts: unknown): IRunExecutionData =>
	({
		executionData: {
			runtimeData: { secureArtifacts },
		},
	}) as unknown as IRunExecutionData;

describe('RuntimeCredentialsAccessService', () => {
	const cipher = mock<Cipher>();
	const rulesService = mock<RuntimeCredentialsService>();
	const targetValidator = mock<CredentialFieldTargetValidator>();
	const service = new RuntimeCredentialsAccessService(cipher, rulesService, targetValidator);

	const plaintextArtifacts = JSON.stringify({
		version: 1,
		artifacts: {
			api_key: ['Bearer xyz', 'Bearer abc'],
		},
	});

	beforeEach(() => {
		vi.clearAllMocks();
		targetValidator.getError.mockReturnValue(undefined);
		cipher.decryptV2.mockResolvedValue(plaintextArtifacts);
	});

	it('returns the array stored under the requested alias', async () => {
		const result = await service.getRuntimeCredential(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'api_key',
		);

		expect(result).toEqual(['Bearer xyz', 'Bearer abc']);
		expect(cipher.decryptV2).toHaveBeenCalledWith(ENCRYPTED_BLOB);
	});

	it('returns undefined when the alias is not in the artifacts map', async () => {
		const result = await service.getRuntimeCredential(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'unknown_alias',
		);

		expect(result).toBeUndefined();
	});

	it('returns undefined and does not call the cipher when secureArtifacts is absent', async () => {
		const runExecutionData = {
			executionData: { runtimeData: {} },
		} as unknown as IRunExecutionData;

		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBeUndefined();
		expect(cipher.decryptV2).not.toHaveBeenCalled();
	});

	it('returns undefined and does not call the cipher when secureArtifacts is not a string', async () => {
		const result = await service.getRuntimeCredential(
			buildRunExecutionData({ not: 'a string' }),
			'api_key',
		);

		expect(result).toBeUndefined();
		expect(cipher.decryptV2).not.toHaveBeenCalled();
	});

	it('throws when the decrypted payload is not a valid ISecureArtifacts shape', async () => {
		cipher.decryptV2.mockResolvedValueOnce('not json');

		await expect(
			service.getRuntimeCredential(buildRunExecutionData(ENCRYPTED_BLOB), 'api_key'),
		).rejects.toThrow();
	});

	describe('getRuntimeCredentialData', () => {
		const rule = (
			path: string,
			transform?: ValueLookupPath['transform'],
		): ValueLookupPath & { credentialType: string } => ({
			nodeType: '*',
			path,
			credentialType: 'gmailOAuth2',
			transform,
		});
		const context = { secureArtifacts: ENCRYPTED_BLOB } as unknown as IExecutionContext;
		const artifacts = (value: Record<string, unknown>) =>
			cipher.decryptV2.mockResolvedValue(JSON.stringify({ version: 1, artifacts: value }));
		const useRule = (r: ReturnType<typeof rule>) =>
			rulesService.getRuleForStub.mockReturnValue({ alias: 'auth', rule: r });
		const run = async (ctx: IExecutionContext | undefined = context, type = 'gmailOAuth2') =>
			await service.getRuntimeCredentialData(ctx, 'stub-id', type);

		it('strips the Bearer prefix and sets the OAuth2 access token', async () => {
			useRule(rule('headers.authorization'));
			artifacts({ auth: ['Bearer abc'] });

			await expect(run()).resolves.toEqual({ oauthTokenData: { access_token: 'abc' } });
			expect(rulesService.getRuleForStub).toHaveBeenCalledWith('stub-id');
		});

		it('copies the value to a named field with the field transform', async () => {
			useRule(rule('headers.x-key', 'field:apiKey'));
			artifacts({ auth: ['k1'] });

			await expect(run()).resolves.toEqual({ apiKey: 'k1' });
		});

		it('refuses a rule whose target field n8n controls and never reads the value', async () => {
			useRule(rule('headers.x-key', 'field:authUrl'));
			targetValidator.getError.mockReturnValue('protected');
			artifacts({ auth: ['k1'] });

			await expect(run()).rejects.toThrow(/targets a field that n8n controls/);
			expect(cipher.decryptV2).not.toHaveBeenCalled();
		});

		it('accepts the same value from several items', async () => {
			useRule(rule('a'));
			artifacts({ auth: ['Bearer abc', 'Bearer abc'] });

			await expect(run()).resolves.toEqual({ oauthTokenData: { access_token: 'abc' } });
		});

		it('throws and names the rule and path, not the values, when values differ', async () => {
			useRule(rule('headers.one'));
			artifacts({ auth: ['secret-one', 'secret-two'] });

			const error = await run().catch((e: Error) => e);

			expect((error as Error).message).toContain('"auth" (headers.one)');
			expect((error as Error).message).not.toContain('secret');
		});

		it('throws when the request gave no value', async () => {
			useRule(rule('a'));
			artifacts({});

			await expect(run()).rejects.toThrow('Run the workflow through its trigger');
		});

		it('throws when the execution context has no secure artifacts', async () => {
			useRule(rule('a'));

			await expect(run(undefined)).rejects.toThrow('Run the workflow through its trigger');
		});

		it('throws when the rule behind the stub was removed', async () => {
			rulesService.getRuleForStub.mockReturnValue(undefined);

			await expect(run()).rejects.toThrow('No run-time input rule is configured');
		});

		it('throws when the rule feeds a different credential type', async () => {
			useRule(rule('a'));

			await expect(run(context, 'slackApi')).rejects.toThrow(
				'No run-time input rule is configured',
			);
		});
	});

	describe('getAllowedDomainsForStub', () => {
		const rule = { nodeType: '*', path: 'headers.x', credentialType: 'httpHeaderAuth' };

		it('returns the list of the rule behind the stub', () => {
			rulesService.getRuleForStub.mockReturnValue({
				alias: 'a',
				rule: { ...rule, allowedDomains: 'api.example.com' },
			});
			expect(service.getAllowedDomainsForStub('stub')).toBe('api.example.com');
		});

		it('returns undefined when the rule has no list or is gone', () => {
			rulesService.getRuleForStub.mockReturnValue({ alias: 'a', rule });
			expect(service.getAllowedDomainsForStub('stub')).toBeUndefined();
			rulesService.getRuleForStub.mockReturnValue(undefined);
			expect(service.getAllowedDomainsForStub('stub')).toBeUndefined();
		});
	});

	describe('getRuntimeCredentialValues', () => {
		it('lists every string with the alias of its rule, flattening arrays', async () => {
			cipher.decryptV2.mockResolvedValue(
				JSON.stringify({
					version: 1,
					artifacts: { a: ['Bearer abc123', ['def456']], b: 'ghi789', c: [1, null] },
				}),
			);

			await expect(
				service.getRuntimeCredentialValues(buildRunExecutionData(ENCRYPTED_BLOB)),
			).resolves.toEqual([
				{ alias: 'a', value: 'Bearer abc123' },
				{ alias: 'a', value: 'def456' },
				{ alias: 'b', value: 'ghi789' },
			]);
		});

		it('returns an empty list and skips the cipher without secure artifacts', async () => {
			await expect(
				service.getRuntimeCredentialValues(buildRunExecutionData(undefined)),
			).resolves.toEqual([]);
			expect(cipher.decryptV2).not.toHaveBeenCalled();
		});
	});

	describe('getRuleAliasForStub', () => {
		it('returns the alias of the rule behind the stub, or undefined when it is gone', () => {
			rulesService.getRuleForStub.mockReturnValue({
				alias: 'tenantKey',
				rule: { nodeType: '*', path: 'a', credentialType: 'httpHeaderAuth' },
			});
			expect(service.getRuleAliasForStub('stub')).toBe('tenantKey');

			rulesService.getRuleForStub.mockReturnValue(undefined);
			expect(service.getRuleAliasForStub('stub')).toBeUndefined();
		});
	});
});
