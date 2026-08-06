import type { Logger } from '@n8n/backend-common';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { INode, INodeExecutionData, PlaintextExecutionContext, Workflow } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import type { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';

import type { InboundAudienceService } from '../inbound-audience.service';
import { InboundClaimVerificationHook } from '../inbound-claim-verification-hook';

function triggerItems(headers?: Record<string, unknown>): INodeExecutionData[] {
	return [{ json: { headers } }];
}

function createOptions(
	overrides?: Partial<ContextEstablishmentOptions>,
): ContextEstablishmentOptions {
	const baseContext: PlaintextExecutionContext = {
		version: 1,
		establishedAt: Date.now(),
		source: 'webhook',
	};

	return {
		triggerNode: { name: 'Webhook', parameters: {} } as INode,
		workflow: {} as Workflow,
		triggerItems: triggerItems({ authorization: 'Bearer valid-token' }),
		context: baseContext,
		options: {},
		...overrides,
	};
}

describe('InboundClaimVerificationHook', () => {
	let hook: InboundClaimVerificationHook;
	let mockLogger: Mocked<Logger>;
	let mockProxy: Mocked<ExternalTokenVerifierProxy>;
	let mockAudienceService: Mocked<InboundAudienceService>;

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		} as unknown as Mocked<Logger>;

		mockProxy = {
			verifyExternalToken: vi.fn(),
		} as unknown as Mocked<ExternalTokenVerifierProxy>;

		mockAudienceService = {
			getExpectedAudiences: vi.fn().mockResolvedValue({ audiences: ['https://n8n.example.com'] }),
		} as unknown as Mocked<InboundAudienceService>;

		hook = new InboundClaimVerificationHook(mockLogger, mockProxy, mockAudienceService);
	});

	it('is never applicable to a trigger node (global hook only)', () => {
		expect(hook.isApplicableToTriggerNode('n8n-nodes-base.webhook')).toBe(false);
	});

	describe('AC1: valid token -> sealed claim, no principal field', () => {
		it('maps a verified claim onto contextUpdate.claims with no principal-shaped field', async () => {
			const expiresAt = new Date('2026-01-01T00:00:00.000Z');
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: {
					sourceId: 'idp-1',
					issuer: 'https://idp.example.com',
					subject: 'user-42',
					audience: 'https://n8n.example.com',
					attributes: { role: 'admin' },
					expiresAt,
				},
			});

			const result = await hook.execute(createOptions());

			expect(result.contextUpdate?.claims).toEqual({
				version: 1,
				sourceId: 'idp-1',
				// Carried because a binding is keyed by issuer + subject, so resolution
				// at access time needs it (see the external-idp source in N8NIdentifier).
				issuer: 'https://idp.example.com',
				subject: 'user-42',
				audience: 'https://n8n.example.com',
				expiresAt: expiresAt.getTime(),
				boundWorkflowId: 'not-yet-sealed',
			});
			expect(result.contextUpdate?.authFailureReason).toBeUndefined();

			const keys = Object.keys(result.contextUpdate?.claims ?? {});
			expect(keys).not.toContain('principalId');
			expect(keys).not.toContain('userId');
			expect(keys).not.toContain('principal');
			// Attributes stay out of the sealed claim - nothing resolves on them.
			expect(keys).not.toContain('attributes');
		});

		it('normalizes a multi-value audience array to its first entry', async () => {
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: {
					sourceId: 'idp-1',
					issuer: 'https://idp.example.com',
					subject: 'user-42',
					audience: ['aud-a', 'aud-b'],
					attributes: {},
					expiresAt: new Date(),
				},
			});

			const result = await hook.execute(createOptions());

			expect(result.contextUpdate?.claims?.audience).toBe('aud-a');
		});

		it('calls the verifier exactly once per execute() call', async () => {
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: null,
				context: { reason: 'invalid_token' },
			});

			await hook.execute(createOptions());

			expect(mockProxy.verifyExternalToken).toHaveBeenCalledTimes(1);
			expect(mockProxy.verifyExternalToken).toHaveBeenCalledWith('valid-token', [
				'https://n8n.example.com',
			]);
		});

		it('passes the full audience set through to the verifier when a resource has several', async () => {
			mockAudienceService.getExpectedAudiences.mockResolvedValue({
				audiences: [
					'https://n8n.example.com/webhook/abc?method=GET',
					'https://n8n.example.com/webhook/abc?method=POST',
				],
			});
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: null,
				context: { reason: 'invalid_token' },
			});

			await hook.execute(createOptions());

			expect(mockProxy.verifyExternalToken).toHaveBeenCalledWith('valid-token', [
				'https://n8n.example.com/webhook/abc?method=GET',
				'https://n8n.example.com/webhook/abc?method=POST',
			]);
		});
	});

	describe('resource_not_found: no resolvable resource for the trigger -> no claim, no throw', () => {
		it('records authFailureReason without calling the verifier', async () => {
			mockAudienceService.getExpectedAudiences.mockResolvedValue({
				reason: 'resource_not_found',
			});

			const result = await hook.execute(createOptions());

			expect(result.contextUpdate).toEqual({ authFailureReason: 'resource_not_found' });
			expect(mockProxy.verifyExternalToken).not.toHaveBeenCalled();
		});
	});

	describe('AC2: invalid/expired/wrong-audience token -> no claim, reason recorded', () => {
		it('records authFailureReason and sets no claim when verification fails', async () => {
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: null,
				context: { reason: 'invalid_token', errorDetails: 'signature mismatch' },
			});

			const result = await hook.execute(createOptions());

			expect(result.contextUpdate).toEqual({ authFailureReason: 'invalid_token' });
			expect(result.contextUpdate?.claims).toBeUndefined();
		});
	});

	describe('AC3: no token presented -> identical to today', () => {
		it('returns an empty result (no contextUpdate at all) when there is no bearer token', async () => {
			const result = await hook.execute(
				createOptions({ triggerItems: triggerItems({ 'x-other': 'value' }) }),
			);

			expect(result).toEqual({});
			expect(mockProxy.verifyExternalToken).not.toHaveBeenCalled();
		});

		it('returns an empty result when there are no trigger items', async () => {
			const result = await hook.execute(createOptions({ triggerItems: null }));

			expect(result).toEqual({});
			expect(mockProxy.verifyExternalToken).not.toHaveBeenCalled();
		});
	});

	describe('AC4: verifier unavailable / unexpected failure -> no throw, identical to today', () => {
		it('records verifier_not_registered without throwing', async () => {
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: null,
				context: { reason: 'verifier_not_registered', errorDetails: 'no provider registered' },
			});

			const result = await hook.execute(createOptions());

			expect(result.contextUpdate).toEqual({ authFailureReason: 'verifier_not_registered' });
		});

		it('never throws even when the proxy itself rejects unexpectedly', async () => {
			mockProxy.verifyExternalToken.mockRejectedValue(new Error('network exploded'));

			await expect(hook.execute(createOptions())).resolves.toEqual({
				contextUpdate: { authFailureReason: 'internal_error' },
			});
			expect(mockLogger.warn).toHaveBeenCalled();
		});
	});

	describe('AC7: claim expiry does not gate whether it is attached', () => {
		it('attaches a claim whose expiresAt is already in the past, identically to a future one', async () => {
			const pastExpiry = new Date(Date.now() - 1000 * 60 * 60);
			mockProxy.verifyExternalToken.mockResolvedValue({
				claim: {
					sourceId: 'idp-1',
					issuer: 'https://idp.example.com',
					subject: 'user-42',
					audience: 'https://n8n.example.com',
					attributes: {},
					expiresAt: pastExpiry,
				},
			});

			const result = await hook.execute(createOptions());

			expect(result.contextUpdate?.claims).toBeDefined();
			expect(result.contextUpdate?.claims?.expiresAt).toBe(pastExpiry.getTime());
			expect(result.contextUpdate?.authFailureReason).toBeUndefined();
		});
	});
});
