import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';
import type { ICredentialContext, INode, IRunExecutionData } from 'n8n-workflow';

import type { AuthService } from '@/auth/auth.service';
import type { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';

import { N8NIdentifier } from '../../../credential-resolvers/identifiers/n8n-identifier';
import { N8NOAuth2Extractor, N8N_OAUTH_EXTRACTOR_NAME } from '../n8n-oauth-extractor';
import { N8nOAuthIdentitySeeder } from '../n8n-oauth-seeder';

const TOKEN = 'super-secret-oauth-token';
const RESOURCE = 'https://host/mcp/workflow-a';

const scopedLogger = (): jest.Mocked<Logger> => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return logger;
};

// Faithful in-memory stand-in for Cipher: encryptV2 returns an opaque handle (never the
// plaintext), decryptV2 resolves it back — so round-trips work while the raw token never
// appears in the serialized run data.
const createVaultCipher = (): jest.Mocked<Cipher> => {
	const vault = new Map<string, string>();
	let counter = 0;
	const cipher = mock<Cipher>();
	cipher.encryptV2.mockImplementation(async (data) => {
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
		const handle = `enc:${counter++}`;
		vault.set(handle, plaintext);
		return handle;
	});
	cipher.decryptV2.mockImplementation(async (handle) => vault.get(handle) ?? 'not-json');
	return cipher;
};

const makeTriggerNode = (): INode => ({
	id: 'node-1',
	name: 'MCP Trigger',
	type: '@n8n/n8n-nodes-langchain.mcpTrigger',
	typeVersion: 2,
	position: [0, 0],
	parameters: { authentication: 'n8nOAuth2' },
});

const makeRunExecutionData = (triggerNode: INode): IRunExecutionData =>
	({
		resultData: { runData: {} },
		executionData: {
			nodeExecutionStack: [{ node: triggerNode, data: { main: [] }, source: null }],
			contextData: {},
			waitingExecution: {},
			waitingExecutionSource: {},
			metadata: {},
		},
	}) as unknown as IRunExecutionData;

describe('n8n-oauth identity seeding', () => {
	describe('round-trip: seeder → extractor → identifier', () => {
		it('propagates token + resource end-to-end and resolves the user', async () => {
			const cipher = createVaultCipher();
			const runExecutionData = makeRunExecutionData(makeTriggerNode());

			// 1. Seed
			await new N8nOAuthIdentitySeeder(scopedLogger(), cipher).seed(
				runExecutionData,
				TOKEN,
				RESOURCE,
			);

			// 2. Extract (reads the item the seeder placed on the stack)
			const triggerItems = runExecutionData.executionData!.nodeExecutionStack[0].data.main[0]!;
			const result = await new N8NOAuth2Extractor(scopedLogger(), cipher).execute({
				triggerItems,
			} as ContextEstablishmentOptions);

			expect(result.contextUpdate?.credentials).toEqual({
				version: 1,
				identity: TOKEN,
				metadata: { source: 'n8n-oauth', resource: RESOURCE },
			});
			expect(triggerItems[0]).not.toHaveProperty('encryptedMetadata');

			// 3. Identify (the extractor's metadata must satisfy the identifier's discriminated union;
			// this is what catches a source-literal contract drift between the two)
			const oauthVerifier = mock<OAuthTokenVerifierProxy>();
			oauthVerifier.verifyOAuthAccessToken.mockResolvedValue({
				user: mock<User>({ id: 'user-9' }),
			});
			const identifier = new N8NIdentifier(mock<AuthService>(), oauthVerifier);

			const userId = await identifier.resolve(
				result.contextUpdate!.credentials as ICredentialContext,
				{},
			);

			expect(userId).toBe('user-9');
			expect(oauthVerifier.verifyOAuthAccessToken).toHaveBeenCalledWith(TOKEN, RESOURCE);
		});

		it('throws and still deletes encryptedMetadata when the blob is invalid', async () => {
			const extractor = new N8NOAuth2Extractor(scopedLogger(), createVaultCipher());
			const item = { json: {}, encryptedMetadata: 'unknown-handle' };

			await expect(
				extractor.execute({ triggerItems: [item] } as unknown as ContextEstablishmentOptions),
			).rejects.toThrow('No valid n8n OAuth authentication metadata could be extracted.');
			expect(item).not.toHaveProperty('encryptedMetadata');
		});
	});

	describe('N8nOAuthIdentitySeeder', () => {
		it('persists only the encrypted blob — never the raw token', async () => {
			const runExecutionData = makeRunExecutionData(makeTriggerNode());

			await new N8nOAuthIdentitySeeder(scopedLogger(), createVaultCipher()).seed(
				runExecutionData,
				TOKEN,
				RESOURCE,
			);

			expect(JSON.stringify(runExecutionData)).not.toContain(TOKEN);
			expect(runExecutionData.executionData!.nodeExecutionStack[0].data.main[0]![0]).toHaveProperty(
				'encryptedMetadata',
			);
		});

		it('injects the hook on a clone without mutating the shared trigger node', async () => {
			const triggerNode = makeTriggerNode();
			const runExecutionData = makeRunExecutionData(triggerNode);

			await new N8nOAuthIdentitySeeder(scopedLogger(), createVaultCipher()).seed(
				runExecutionData,
				TOKEN,
				RESOURCE,
			);

			// Original node untouched (would otherwise leak the injected hook into the persisted snapshot)
			expect(triggerNode.parameters).toEqual({ authentication: 'n8nOAuth2' });

			const stackNode = runExecutionData.executionData!.nodeExecutionStack[0].node;
			expect(stackNode).not.toBe(triggerNode);
			expect(stackNode.parameters.executionsHooksVersion).toBe(1);
			expect(stackNode.parameters.contextEstablishmentHooks).toEqual({
				hooks: [{ hookName: N8N_OAUTH_EXTRACTOR_NAME, isAllowedToFail: true }],
			});
		});
	});
});
