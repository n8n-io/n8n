import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import {
	extractServiceHost,
	resolveCredentialForApply,
	serviceHostsMatch,
} from '../credential-utils';

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
				error: 'Credential type "openAiApi" is not supported by Gateway credits',
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

describe('extractServiceHost', () => {
	it.each([
		['https://api.pexels.com/v1/search?query=x', 'api.pexels.com'],
		['=https://queue.fal.run/fal-ai/kling/{{ $json.id }}', 'queue.fal.run'],
		['HTTPS://API.APIFY.COM/v2/acts', 'api.apify.com'],
	])('derives the host of %s', (url, host) => {
		expect(extractServiceHost(url)).toBe(host);
	});

	it.each([['={{ $json.url }}'], ['not a url'], [''], [undefined], [42]])(
		'returns undefined for %s',
		(url) => {
			expect(extractServiceHost(url)).toBeUndefined();
		},
	);
});

describe('serviceHostsMatch', () => {
	it.each([
		['api.pexels.com', 'api.pexels.com'],
		['queue.fal.run', 'fal.run'],
		['fal.run', 'queue.fal.run'],
	])('matches %s with %s', (a, b) => {
		expect(serviceHostsMatch(a, b)).toBe(true);
	});

	it.each([
		['api.pexels.com', 'api.apify.com'],
		['api.foo.co.uk', 'api.bar.co.uk'],
		['fal.run', 'unfal.run'],
	])('rejects %s vs %s', (a, b) => {
		expect(serviceHostsMatch(a, b)).toBe(false);
	});
});
