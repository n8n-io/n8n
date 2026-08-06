import type { Logger } from '@n8n/backend-common';
import type { ExecutionContextService } from 'n8n-core';
import type { ICredentialContext, IVerifiedClaim } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialResolutionContextBuilder } from '../credential-resolution-context.builder';

describe('CredentialResolutionContextBuilder', () => {
	let builder: CredentialResolutionContextBuilder;
	let logger: Logger;
	let executionContextService: ExecutionContextService;

	const claim: IVerifiedClaim = {
		version: 1,
		sourceId: 'source-1',
		issuer: 'https://idp.example.com',
		subject: 'external-subject-1',
		audience: 'https://n8n.example.com',
		expiresAt: Date.now() + 60_000,
		boundWorkflowId: 'workflow-1',
	};

	const cookieContext: ICredentialContext = {
		version: 1,
		identity: 'n8n-auth-cookie',
		metadata: { source: 'cookie-source' },
	};

	beforeEach(() => {
		logger = mock<Logger>();
		executionContextService = mock<ExecutionContextService>();
		builder = new CredentialResolutionContextBuilder(logger, executionContextService);
	});

	it('returns undefined when there is no execution context', async () => {
		expect(await builder.build(undefined, 'workflow-1')).toBeUndefined();
	});

	it('returns undefined when the execution context carries no identity', async () => {
		expect(await builder.build({}, 'workflow-1')).toBeUndefined();
	});

	it('synthesizes an external-idp context when only a claim is present', async () => {
		vi.mocked(executionContextService.decryptClaims).mockResolvedValue(claim);

		const result = await builder.build({ claims: 'sealed' }, 'workflow-1');

		expect(result).toEqual({
			version: 1,
			identity: '',
			metadata: { source: 'external-idp' },
			claims: claim,
		});
		expect(executionContextService.decryptClaims).toHaveBeenCalledWith('sealed', 'workflow-1');
	});

	it('keeps an existing credential context and attaches the claim to it', async () => {
		vi.mocked(executionContextService.decryptCredentialContext).mockResolvedValue(cookieContext);
		vi.mocked(executionContextService.decryptClaims).mockResolvedValue(claim);

		const result = await builder.build(
			{ credentials: 'encrypted', claims: 'sealed' },
			'workflow-1',
		);

		expect(result).toEqual({ ...cookieContext, claims: claim });
	});

	it('returns the credential context untouched when there is no claim', async () => {
		vi.mocked(executionContextService.decryptCredentialContext).mockResolvedValue(cookieContext);

		const result = await builder.build({ credentials: 'encrypted' }, 'workflow-1');

		expect(result).toEqual(cookieContext);
		expect(executionContextService.decryptClaims).not.toHaveBeenCalled();
	});

	it('drops a claim sealed for another workflow', async () => {
		// decryptClaims returns undefined on a workflow-binding mismatch.
		vi.mocked(executionContextService.decryptClaims).mockResolvedValue(undefined);

		expect(await builder.build({ claims: 'sealed-elsewhere' }, 'workflow-2')).toBeUndefined();
	});

	it('drops the claim when no workflow id is available to check the seal against', async () => {
		expect(await builder.build({ claims: 'sealed' }, undefined)).toBeUndefined();
		expect(executionContextService.decryptClaims).not.toHaveBeenCalled();
	});

	it('returns undefined when the credential context cannot be decrypted', async () => {
		vi.mocked(executionContextService.decryptCredentialContext).mockRejectedValue(
			new Error('bad decrypt'),
		);

		expect(await builder.build({ credentials: 'corrupt' }, 'workflow-1')).toBeUndefined();
	});
});
