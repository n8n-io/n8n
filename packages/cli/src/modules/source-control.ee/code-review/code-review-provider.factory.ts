import { Service } from '@n8n/di';

import { getApiBaseUrl, getRepoType, parseRepoCoordinates } from '../source-control-helper.ee';
import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { CodeReviewProvider } from './code-review-provider';
import { GitHubProvider } from './providers/github-provider';

/**
 * Resolves the right {@link CodeReviewProvider} for the connected repository,
 * based on its remote URL and the stored API token. Returns `null` when the
 * feature is unavailable (unsupported host or no token configured).
 */
@Service()
export class CodeReviewProviderFactory {
	constructor(private readonly preferencesService: SourceControlPreferencesService) {}

	async getProvider(): Promise<CodeReviewProvider | null> {
		const { repositoryUrl } = this.preferencesService.getPreferences();
		if (!repositoryUrl) return null;

		const type = getRepoType(repositoryUrl);
		if (type === 'other') return null;

		const token = await this.preferencesService.getDecryptedApiToken();
		if (!token) return null;

		const { owner, repo } = parseRepoCoordinates(repositoryUrl);
		const apiBaseUrl = getApiBaseUrl(repositoryUrl, type);

		switch (type) {
			case 'github':
				return new GitHubProvider({ apiBaseUrl, token, owner, repo });
			case 'gitlab':
				// GitLab provider is a planned follow-up; the interface is ready for it.
				return null;
		}
	}
}
