import { Config, Env } from '@n8n/config';

/**
 * Instance-level settings for the github-review promotion model (POC:
 * env-var based; the real feature would store these like source control's
 * Cipher-encrypted preferences). The token authenticates both planes: git
 * clone/push over HTTPS and the GitHub REST/GraphQL API. Each instance must
 * use a token from its own GitHub identity — the PR author cannot approve
 * its own PR, so source and destination need distinct accounts.
 */
@Config
export class PromotionsConfig {
	/** GitHub token (classic PAT with `repo` scope) identifying this instance. */
	@Env('N8N_PROMOTIONS_GITHUB_TOKEN')
	githubToken: string = '';

	/** GitHub repository mediating promotions, in "owner/name" form. */
	@Env('N8N_PROMOTIONS_GITHUB_REPO')
	githubRepo: string = '';

	/** The environment branch this instance applies promotions from (the PR base branch it watches). */
	@Env('N8N_PROMOTIONS_GITHUB_BRANCH')
	githubBranch: string = '';

	/** Poll interval in seconds for PR discovery and updates; 0 disables the tracker. */
	@Env('N8N_PROMOTIONS_GITHUB_POLL_INTERVAL')
	githubPollInterval: number = 0;
}
