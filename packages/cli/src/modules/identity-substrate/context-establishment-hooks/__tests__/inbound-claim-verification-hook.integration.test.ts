import { Container } from '@n8n/di';
import {
	ExecutionContextHookRegistry,
	ExecutionContextService,
	establishExecutionContext,
	type Cipher,
} from 'n8n-core';
import {
	createRunExecutionData,
	type INode,
	type IVerifiedClaim,
	type IWorkflowExecuteAdditionalData,
	type Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';
import type { ExternalTokenVerifier } from '@/services/external-token-verifier-proxy.service';

import type { InboundAudienceService } from '../inbound-audience.service';
import { InboundClaimVerificationHook } from '../inbound-claim-verification-hook';

/**
 * Wires the real InboundClaimVerificationHook, ExternalTokenVerifierProxy and
 * ExecutionContextService together and drives them through
 * establishExecutionContext, proving the end-to-end contract from the
 * ticket's acceptance criteria - in particular that verification happens
 * exactly once per request and that the second establishExecutionContext
 * call (main -> worker) is a true no-op, not just an assumption about the
 * runtimeData early-exit.
 */
describe('InboundClaimVerificationHook integration with establishExecutionContext', () => {
	const buildWorkflow = () => mock<Workflow>({ id: 'wf-1' });

	const buildRunExecutionData = (headers?: Record<string, unknown>) => {
		const startNode = mock<INode>({ name: 'Webhook', type: 'n8n-nodes-base.webhook' });
		return createRunExecutionData({
			startData: {},
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [
					{ node: startNode, data: { main: [[{ json: { headers } }]] }, source: null },
				],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		});
	};

	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
		encryptedRunnerIdentity: undefined,
	});

	// Encrypt/decrypt as plain JSON round-trip so assertions can inspect the
	// sealed claim without needing real crypto - sealing/unsealing itself is
	// already covered by ExecutionContextService's own unit tests.
	const passthroughCipher = mock<Cipher>({
		encryptV2: async (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
		decryptV2: async (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
	});

	let proxy: ExternalTokenVerifierProxy;
	let provider: ReturnType<typeof mock<ExternalTokenVerifier>>;
	let audienceService: ReturnType<typeof mock<InboundAudienceService>>;

	beforeEach(() => {
		proxy = new ExternalTokenVerifierProxy();
		provider = mock<ExternalTokenVerifier>();
		proxy.registerProvider(provider);

		audienceService = mock<InboundAudienceService>();
		audienceService.getExpectedAudiences.mockResolvedValue({
			audiences: ['https://n8n.example.com'],
		});

		const hook = new InboundClaimVerificationHook(mock(), proxy, audienceService);

		const hookRegistry = mock<ExecutionContextHookRegistry>();
		hookRegistry.getGlobalHooks.mockReturnValue([hook]);
		hookRegistry.getSubExecutionHooks.mockReturnValue([]);

		const executionContextService = new ExecutionContextService(
			mock(),
			hookRegistry,
			passthroughCipher,
		);

		Container.set(ExecutionContextHookRegistry, hookRegistry);
		Container.set(ExecutionContextService, executionContextService);
	});

	afterEach(() => {
		Container.reset();
	});

	it('AC1: a valid token results in a sealed claim on runtimeData with no principal field', async () => {
		const expiresAt = new Date('2026-06-01T00:00:00.000Z');
		provider.verifyExternalToken.mockResolvedValue({
			claim: {
				sourceId: 'idp-1',
				issuer: 'https://idp.example.com',
				subject: 'user-42',
				audience: 'https://n8n.example.com',
				attributes: {},
				expiresAt,
			},
			policy: { kid: 'kid-1', requireVerifiedEmail: true },
		});

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer good-token' });

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');

		const runtimeData = runExecutionData.executionData!.runtimeData!;
		expect(runtimeData.claims).toBeDefined();

		const sealedClaim = JSON.parse(runtimeData.claims as string) as IVerifiedClaim;
		expect(sealedClaim).toMatchObject({
			version: 1,
			sourceId: 'idp-1',
			subject: 'user-42',
			audience: 'https://n8n.example.com',
			expiresAt: expiresAt.getTime(),
			boundWorkflowId: 'wf-1',
		});
		expect(Object.keys(sealedClaim)).not.toContain('principalId');
		expect(runtimeData.authFailureReason).toBeUndefined();
	});

	it('IAM-1173: passes every accepted audience for the resolved resource through to the verifier', async () => {
		audienceService.getExpectedAudiences.mockResolvedValue({
			audiences: [
				'https://n8n.example.com/webhook/abc?method=GET',
				'https://n8n.example.com/webhook/abc?method=POST',
			],
		});
		provider.verifyExternalToken.mockResolvedValue({
			claim: null,
			context: { reason: 'invalid_token' },
		});

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer some-token' });

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');

		expect(provider.verifyExternalToken).toHaveBeenCalledWith('some-token', [
			'https://n8n.example.com/webhook/abc?method=GET',
			'https://n8n.example.com/webhook/abc?method=POST',
		]);
	});

	it('AC2: an invalid token records authFailureReason and sets no claim', async () => {
		provider.verifyExternalToken.mockResolvedValue({
			claim: null,
			context: { reason: 'invalid_token', errorDetails: 'bad signature' },
		});

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer bad-token' });

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');

		const runtimeData = runExecutionData.executionData!.runtimeData!;
		expect(runtimeData.claims).toBeUndefined();
		expect(runtimeData.authFailureReason).toBe('invalid_token');
	});

	it('AC3: no token presented leaves the context exactly as it would be today', async () => {
		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData(undefined);

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');

		const runtimeData = runExecutionData.executionData!.runtimeData!;
		expect(runtimeData.claims).toBeUndefined();
		expect(runtimeData.authFailureReason).toBeUndefined();
		expect(provider.verifyExternalToken).not.toHaveBeenCalled();
	});

	it('AC4: an unregistered verifier proxy proceeds without throwing', async () => {
		const unregisteredProxy = new ExternalTokenVerifierProxy();
		const hook = new InboundClaimVerificationHook(mock(), unregisteredProxy, audienceService);
		const hookRegistry = mock<ExecutionContextHookRegistry>();
		hookRegistry.getGlobalHooks.mockReturnValue([hook]);
		hookRegistry.getSubExecutionHooks.mockReturnValue([]);
		Container.set(
			ExecutionContextService,
			new ExecutionContextService(mock(), hookRegistry, passthroughCipher),
		);

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer some-token' });

		await expect(
			establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook'),
		).resolves.not.toThrow();

		const runtimeData = runExecutionData.executionData!.runtimeData!;
		expect(runtimeData.claims).toBeUndefined();
		expect(runtimeData.authFailureReason).toBe('verifier_not_registered');
	});

	it('IAM-1173: no resolvable resource for the trigger fails closed without calling the verifier', async () => {
		audienceService.getExpectedAudiences.mockResolvedValue({ reason: 'resource_not_found' });

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer some-token' });

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');

		const runtimeData = runExecutionData.executionData!.runtimeData!;
		expect(runtimeData.claims).toBeUndefined();
		expect(runtimeData.authFailureReason).toBe('resource_not_found');
		expect(provider.verifyExternalToken).not.toHaveBeenCalled();
	});

	it('AC5 & AC6: verification happens exactly once, and a second establishExecutionContext call is a no-op', async () => {
		provider.verifyExternalToken.mockResolvedValue({
			claim: {
				sourceId: 'idp-1',
				issuer: 'https://idp.example.com',
				subject: 'user-42',
				audience: 'https://n8n.example.com',
				attributes: {},
				expiresAt: new Date('2026-06-01T00:00:00.000Z'),
			},
			policy: { kid: 'kid-1', requireVerifiedEmail: true },
		});

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer good-token' });

		// First call: e.g. workflow-runner.ts on the main process.
		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');
		expect(provider.verifyExternalToken).toHaveBeenCalledTimes(1);
		const runtimeDataAfterFirstCall = runExecutionData.executionData!.runtimeData;

		// Second call: e.g. workflow-execute.ts on the worker. The runtimeData
		// early-exit must make this a no-op - not a new mechanism this hook adds.
		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');
		expect(provider.verifyExternalToken).toHaveBeenCalledTimes(1);
		expect(runExecutionData.executionData!.runtimeData).toBe(runtimeDataAfterFirstCall);
	});

	it('AC7: a claim whose token has already expired is still sealed and attached', async () => {
		const pastExpiry = new Date(Date.now() - 1000 * 60 * 60);
		provider.verifyExternalToken.mockResolvedValue({
			claim: {
				sourceId: 'idp-1',
				issuer: 'https://idp.example.com',
				subject: 'user-42',
				audience: 'https://n8n.example.com',
				attributes: {},
				expiresAt: pastExpiry,
			},
			policy: { kid: 'kid-1', requireVerifiedEmail: true },
		});

		const workflow = buildWorkflow();
		const runExecutionData = buildRunExecutionData({ authorization: 'Bearer stale-but-valid-sig' });

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');

		const runtimeData = runExecutionData.executionData!.runtimeData!;
		const sealedClaim = JSON.parse(runtimeData.claims as string) as IVerifiedClaim;
		expect(sealedClaim.expiresAt).toBe(pastExpiry.getTime());
		expect(runtimeData.authFailureReason).toBeUndefined();
	});
});
