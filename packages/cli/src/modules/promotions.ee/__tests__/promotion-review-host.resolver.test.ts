import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';

import { PromotionReviewHostResolver } from '../promotion-review-host.resolver';
import type { PromotionProvidersService } from '../promotion-providers.service';
import type { PromotionOperationInput } from '../promotions.types';

describe('PromotionReviewHostResolver', () => {
	const providersService = mock<PromotionProvidersService>();
	const resolver = new PromotionReviewHostResolver(providersService);

	const input = (over: Partial<PromotionOperationInput> = {}): PromotionOperationInput => ({
		environmentId: 'env1',
		scope: 'instance',
		providerId: 'prov1',
		providerType: 'gitlab',
		authType: 'token',
		encryptedAuth: 'enc',
		hostBaseUrl: 'https://gitlab.example.com/gitlab',
		remote: {
			schemaVersion: 1,
			remoteUrl: 'https://gitlab.example.com/gitlab/platform/api.git',
		},
		config: {
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
		},
		...over,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		providersService.decryptCredentials.mockResolvedValue({
			authType: 'token',
			username: 'n8n',
			password: 'glpat-token',
		});
	});

	it('returns null for a plain Git provider', async () => {
		await expect(resolver.resolve(input({ providerType: 'git' }))).resolves.toBeNull();
		expect(providersService.getEntity).not.toHaveBeenCalled();
		expect(providersService.decryptCredentials).not.toHaveBeenCalled();
	});

	it('returns the snapshotted GitLab base URL, token, and repository path', async () => {
		await expect(resolver.resolve(input())).resolves.toEqual({
			access: {
				baseUrl: 'https://gitlab.example.com/gitlab',
				accessToken: 'glpat-token',
			},
			projectPath: 'platform/api',
		});
		expect(providersService.getEntity).not.toHaveBeenCalled();
		expect(providersService.decryptCredentials).toHaveBeenCalledWith({
			authType: 'token',
			auth: 'enc',
		});
	});

	it('rejects a GitLab snapshot that has no base URL', async () => {
		await expect(resolver.resolve(input({ hostBaseUrl: null }))).rejects.toThrow(BadRequestError);
		expect(providersService.decryptCredentials).not.toHaveBeenCalled();
	});

	it('rejects credentials that are not a token', async () => {
		providersService.decryptCredentials.mockResolvedValue({
			authType: 'ssh-key',
			privateKey: 'key',
		});

		await expect(resolver.resolve(input())).rejects.toThrow(BadRequestError);
	});

	it('rejects a repository URL that does not use the GitLab base URL', async () => {
		await expect(
			resolver.resolve(
				input({
					remote: { schemaVersion: 1, remoteUrl: 'https://github.com/org/repo.git' },
				}),
			),
		).rejects.toThrow('The repository URL must use the saved GitLab base URL.');
	});
});
