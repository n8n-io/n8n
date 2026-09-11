import type { Logger } from '@n8n/backend-common';
import type { CredentialsRepository } from '@n8n/db';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { ICredentialContext, INode, PlaintextExecutionContext, Workflow } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { ExecutingUserIdentifierProxy } from '@/credentials/executing-user-identifier-proxy';

import { DynamicCredentialsContextHook } from '../dynamic-credentials-context-hook';

describe('DynamicCredentialsContextHook', () => {
	let logger: MockProxy<Logger>;
	let credentialsRepository: MockProxy<CredentialsRepository>;
	let executingUserIdentifierProxy: MockProxy<ExecutingUserIdentifierProxy>;
	let hook: DynamicCredentialsContextHook;

	// Plain object (not a deep mock) so `context.credentials` reaches the hook as-is.
	const buildOptions = (
		nodes: Record<string, INode>,
		credentials?: ICredentialContext,
	): ContextEstablishmentOptions =>
		({
			workflow: { nodes } as unknown as Workflow,
			context: credentials
				? ({
						version: 1,
						establishedAt: 0,
						source: 'manual',
						credentials,
					} as PlaintextExecutionContext)
				: undefined,
		}) as ContextEstablishmentOptions;

	const node = (credentials?: INode['credentials']): INode =>
		({
			name: 'n',
			type: 't',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials,
		}) as INode;

	const carrier = (): ICredentialContext => ({
		version: 1,
		identity: 'token',
		metadata: { source: 'manual-execution' },
	});

	beforeEach(() => {
		logger = mock<Logger>();
		credentialsRepository = mock<CredentialsRepository>();
		credentialsRepository.hasResolvableCredential.mockResolvedValue(false);
		executingUserIdentifierProxy = mock<ExecutingUserIdentifierProxy>();
		executingUserIdentifierProxy.identify.mockResolvedValue(undefined);
		hook = new DynamicCredentialsContextHook(
			logger,
			credentialsRepository,
			executingUserIdentifierProxy,
		);
	});

	describe('usesDynamicCredentials flag', () => {
		it('stamps the flag when the workflow references a private credential', async () => {
			credentialsRepository.hasResolvableCredential.mockResolvedValue(true);
			const options = buildOptions({
				A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }),
				B: node({ httpHeaderAuth: { id: 'cred-2', name: 'c2' } }),
			});

			const result = await hook.execute(options);

			expect(credentialsRepository.hasResolvableCredential).toHaveBeenCalledWith([
				'cred-1',
				'cred-2',
			]);
			expect(result).toEqual({ contextUpdate: { usesDynamicCredentials: true } });
		});

		it('does not stamp the flag when no referenced credential is resolvable', async () => {
			const options = buildOptions({ A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }) });

			const result = await hook.execute(options);

			expect(result).toEqual({});
		});

		it('skips credentials without an id and dedupes repeated ids', async () => {
			const options = buildOptions({
				A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }),
				B: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }),
				C: node({ httpHeaderAuth: { id: null, name: 'unsaved' } }),
				D: node(undefined),
			});

			await hook.execute(options);

			expect(credentialsRepository.hasResolvableCredential).toHaveBeenCalledWith(['cred-1']);
		});

		it('over-redacts and does not attribute an owner when the lookup fails', async () => {
			credentialsRepository.hasResolvableCredential.mockRejectedValue(new Error('db down'));
			const options = buildOptions(
				{ A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }) },
				carrier(),
			);

			const result = await hook.execute(options);

			expect(result).toEqual({ contextUpdate: { usesDynamicCredentials: true } });
			expect(executingUserIdentifierProxy.identify).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('executedByUserId from the identity carrier', () => {
		beforeEach(() => {
			// executedByUserId only matters for a private-credential run.
			credentialsRepository.hasResolvableCredential.mockResolvedValue(true);
		});

		it('stamps the user the identifier resolves from the carrier', async () => {
			executingUserIdentifierProxy.identify.mockResolvedValue('user-42');
			const context = carrier();
			const options = buildOptions(
				{ A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }) },
				context,
			);

			const result = await hook.execute(options);

			expect(executingUserIdentifierProxy.identify).toHaveBeenCalledWith(context);
			expect(result).toEqual({
				contextUpdate: { usesDynamicCredentials: true, executedByUserId: 'user-42' },
			});
		});

		it('stamps only the flag when the identifier resolves no user', async () => {
			executingUserIdentifierProxy.identify.mockResolvedValue(undefined);
			const options = buildOptions(
				{ A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }) },
				carrier(),
			);

			const result = await hook.execute(options);

			expect(result).toEqual({ contextUpdate: { usesDynamicCredentials: true } });
		});

		it('does not call the identifier when the workflow uses no private credential', async () => {
			credentialsRepository.hasResolvableCredential.mockResolvedValue(false);
			const options = buildOptions({ A: node() }, carrier());

			const result = await hook.execute(options);

			expect(executingUserIdentifierProxy.identify).not.toHaveBeenCalled();
			expect(result).toEqual({});
		});

		it('does not call the identifier when there is no identity carrier', async () => {
			const options = buildOptions({ A: node({ httpBasicAuth: { id: 'cred-1', name: 'c1' } }) });

			const result = await hook.execute(options);

			expect(executingUserIdentifierProxy.identify).not.toHaveBeenCalled();
			expect(result).toEqual({ contextUpdate: { usesDynamicCredentials: true } });
		});
	});
});
