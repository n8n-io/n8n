import { Config, Env } from '@n8n/config';

/**
 * Configuration for the instance-pull demo module.
 *
 * The whole module is inert unless `N8N_INSTANCE_PULL_DEMO=true`. The remaining
 * fields point both instances (`dev` and `prd`) at one real GitHub repo.
 */
@Config
export class InstancePullConfig {
	/** Master feature gate. The module is a no-op unless this is true. */
	@Env('N8N_INSTANCE_PULL_DEMO')
	enabled: boolean = false;

	/** Role of this instance: `dev` raises reviews, `prd` validates and publishes. */
	@Env('INSTANCE_PULL_ROLE')
	role: 'dev' | 'prd' = 'dev';

	/** HTTPS clone URL of the shared GitHub repo. */
	@Env('INSTANCE_PULL_REPO_URL')
	repoUrl: string = '';

	/** Base branch that feature branches target and that prd publishes from. */
	@Env('INSTANCE_PULL_BRANCH_BASE')
	branchBase: string = 'main';

	/** GitHub repo owner (user or org). */
	@Env('INSTANCE_PULL_GH_OWNER')
	ghOwner: string = '';

	/** GitHub repo name. */
	@Env('INSTANCE_PULL_GH_REPO')
	ghRepo: string = '';

	/** GitHub personal access token (used for git HTTPS auth and the API). */
	@Env('INSTANCE_PULL_GH_TOKEN')
	ghToken: string = '';
}
