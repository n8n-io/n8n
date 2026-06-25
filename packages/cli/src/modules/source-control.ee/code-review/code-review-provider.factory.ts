import { Service } from '@n8n/di';

import { getApiBaseUrl, getRepoType, parseRepoCoordinates } from '../source-control-helper.ee';
import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { GitHubAppTokenService } from './auth/github-app-token.service.ee';
import type { CodeReviewProvider } from './code-review-provider';
import { GitHubProvider } from './providers/github-provider';

/**
 * Resolves the right {@link CodeReviewProvider} for the connected repository,
 * based on its remote URL and the configured auth method (PAT or GitHub App).
 * Returns `null` when the feature is unavailable (unsupported host or no
 * credentials configured).
 */
@Service()
export class CodeReviewProviderFactory {
	constructor(
		private readonly preferencesService: SourceControlPreferencesService,
		private readonly githubAppTokenService: GitHubAppTokenService,
	) {}

	async getProvider(): Promise<CodeReviewProvider | null> {
		const { repositoryUrl, apiAuthMethod } = this.preferencesService.getPreferences();
		if (!repositoryUrl) return null;

		const type = getRepoType(repositoryUrl);
		if (type === 'other') return null;

		const { owner, repo } = parseRepoCoordinates(repositoryUrl);
		const apiBaseUrl = getApiBaseUrl(repositoryUrl, type);

		switch (type) {
			case 'github': {
				const token = await this.resolveGitHubToken(apiAuthMethod ?? 'pat', {
					apiBaseUrl,
					owner,
					repo,
				});
				if (!token) return null;
				return new GitHubProvider({ apiBaseUrl, token, owner, repo });
			}
			case 'gitlab':
				// GitLab provider is a planned follow-up; the interface is ready for it.
				return null;
		}
	}

	/** PAT → stored token; GitHub App → freshly minted (cached) installation token. */
	private async resolveGitHubToken(
		authMethod: 'pat' | 'githubApp',
		repo: { apiBaseUrl: string; owner: string; repo: string },
	): Promise<string | null> {
		if (authMethod === 'githubApp') {
			const creds = await this.preferencesService.getDecryptedGithubAppCredentials();
			if (!creds) return null;
			return await this.githubAppTokenService.getInstallationToken({ ...repo, ...creds });
		}
		return await this.preferencesService.getDecryptedApiToken();
	}
}
