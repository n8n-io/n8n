import { mock } from 'jest-mock-extended';

import { GitHubAppTokenService } from '../auth/github-app-token.service.ee';
import { CodeReviewProviderFactory } from '../code-review-provider.factory';
import { GitHubProvider } from '../providers/github-provider';
import type { SourceControlPreferencesService } from '../../source-control-preferences.service.ee';

describe('CodeReviewProviderFactory', () => {
	const githubUrl = 'git@github.com:acme/flows.git';

	const setup = (
		prefsOverrides: Partial<{ repositoryUrl: string; apiAuthMethod: 'pat' | 'githubApp' }>,
	) => {
		const prefs = mock<SourceControlPreferencesService>();
		prefs.getPreferences.mockReturnValue({
			repositoryUrl: githubUrl,
			...prefsOverrides,
		} as never);
		const appTokenService = mock<GitHubAppTokenService>();
		const factory = new CodeReviewProviderFactory(prefs, appTokenService);
		return { factory, prefs, appTokenService };
	};

	it('uses the PAT for the pat auth method', async () => {
		const { factory, prefs, appTokenService } = setup({ apiAuthMethod: 'pat' });
		prefs.getDecryptedApiToken.mockResolvedValue('ghp_pat');

		const provider = await factory.getProvider();

		expect(provider).toBeInstanceOf(GitHubProvider);
		expect(prefs.getDecryptedApiToken).toHaveBeenCalled();
		expect(appTokenService.getInstallationToken).not.toHaveBeenCalled();
	});

	it('defaults to PAT when no auth method is set', async () => {
		const { factory, prefs } = setup({});
		prefs.getDecryptedApiToken.mockResolvedValue('ghp_pat');

		expect(await factory.getProvider()).toBeInstanceOf(GitHubProvider);
	});

	it('mints a GitHub App installation token for the githubApp auth method', async () => {
		const { factory, prefs, appTokenService } = setup({ apiAuthMethod: 'githubApp' });
		prefs.getDecryptedGithubAppCredentials.mockResolvedValue({
			appId: '123',
			privateKey: 'pem',
		});
		appTokenService.getInstallationToken.mockResolvedValue('ghs_installation');

		const provider = await factory.getProvider();

		expect(provider).toBeInstanceOf(GitHubProvider);
		expect(appTokenService.getInstallationToken).toHaveBeenCalledWith({
			apiBaseUrl: 'https://api.github.com',
			owner: 'acme',
			repo: 'flows',
			appId: '123',
			privateKey: 'pem',
		});
		expect(prefs.getDecryptedApiToken).not.toHaveBeenCalled();
	});

	it('returns null when githubApp is selected but no credentials are stored', async () => {
		const { factory, prefs, appTokenService } = setup({ apiAuthMethod: 'githubApp' });
		prefs.getDecryptedGithubAppCredentials.mockResolvedValue(null);

		expect(await factory.getProvider()).toBeNull();
		expect(appTokenService.getInstallationToken).not.toHaveBeenCalled();
	});

	it('returns null when the PAT is missing', async () => {
		const { factory, prefs } = setup({ apiAuthMethod: 'pat' });
		prefs.getDecryptedApiToken.mockResolvedValue(null);

		expect(await factory.getProvider()).toBeNull();
	});

	it('returns null for unsupported hosts', async () => {
		const { factory } = setup({ repositoryUrl: 'git@bitbucket.org:acme/flows.git' });

		expect(await factory.getProvider()).toBeNull();
	});
});
