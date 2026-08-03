import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { resolveCredentialForApply } from '../credential-utils';

function makeContext(
	isAiGatewayCredentialType?: (credType: string) => Promise<boolean>,
): Pick<InstanceAiContext, 'credentialService'> {
	return {
		credentialService: {
			list: vi.fn(),
			get: vi.fn().mockResolvedValue({ id: 'cred-1', name: 'My Cred' }),
			delete: vi.fn(),
			test: vi.fn(),
			...(isAiGatewayCredentialType ? { isAiGatewayCredentialType } : {}),
		},
	};
}

describe('resolveCredentialForApply', () => {
	describe('AI Gateway managed credentials', () => {
		it('resolves when isAiGatewayCredentialType returns true', async () => {
			const context = makeContext(vi.fn().mockResolvedValue(true));

			const result = await resolveCredentialForApply('openAiApi', AI_GATEWAY_MANAGED_TAG, context);

			expect(result).toEqual({
				resolved: true,
				credential: { id: null, name: '', __aiGatewayManaged: true },
			});
		});

		it('returns an error when isAiGatewayCredentialType returns false', async () => {
			const context = makeContext(vi.fn().mockResolvedValue(false));

			const result = await resolveCredentialForApply('openAiApi', AI_GATEWAY_MANAGED_TAG, context);

			expect(result).toEqual({
				resolved: false,
				error: 'Credential type "openAiApi" is not supported by n8n credits',
			});
		});

		it('resolves when isAiGatewayCredentialType is not present (backwards-compatible)', async () => {
			// Service does not implement the optional method
			const context = makeContext(undefined);

			const result = await resolveCredentialForApply('openAiApi', AI_GATEWAY_MANAGED_TAG, context);

			expect(result).toEqual({
				resolved: true,
				credential: { id: null, name: '', __aiGatewayManaged: true },
			});
		});
	});

	describe('regular credentials', () => {
		it('resolves a real credential by id', async () => {
			const context = makeContext();

			const result = await resolveCredentialForApply('openAiApi', 'cred-1', context);

			expect(result).toEqual({ resolved: true, credential: { id: 'cred-1', name: 'My Cred' } });
		});

		it('returns an error when the credential is not found', async () => {
			const context = makeContext();
			(context.credentialService.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

			const result = await resolveCredentialForApply('openAiApi', 'missing-id', context);

			expect(result.resolved).toBe(false);
		});
	});
});
