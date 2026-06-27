import { Config, Env } from '@n8n/config';

/**
 * Configuration for the instance-pull demo (git-backed workflow release).
 *
 * The whole feature is inert unless `N8N_INSTANCE_PULL_DEMO=true`. The deploy
 * flow is CI-driven: a GitHub Action runs `n8n-cli deploy` against the prd
 * instance, so prd needs no GitHub connectivity — only `publicUrl` (to build
 * the credential-binding link). The GitHub fields are used by the `dev`
 * instance to raise a review (export -> commit -> open PR).
 */
@Config
export class InstancePullConfig {
	/** Master feature gate. The feature is a no-op unless this is true. */
	@Env('N8N_INSTANCE_PULL_DEMO')
	enabled: boolean = false;

	/** Role of this instance: `dev` raises reviews, `prd` validates and publishes. */
	@Env('INSTANCE_PULL_ROLE')
	role: 'dev' | 'prd' = 'dev';

	/**
	 * Public base URL of THIS instance (prd), e.g. `https://n8n.prd.com`. Used to
	 * build the `/<base>/credential-binding/<pr>` link returned by the dry-run.
	 */
	@Env('INSTANCE_PULL_PUBLIC_URL')
	publicUrl: string = '';

	/** HTTPS clone URL of the shared production-workflows GitHub repo (dev only). */
	@Env('INSTANCE_PULL_REPO_URL')
	repoUrl: string = '';

	/** Base branch that feature branches target and that prd publishes from. */
	@Env('INSTANCE_PULL_BRANCH_BASE')
	branchBase: string = 'main';

	/** GitHub repo owner (user or org) of the production-workflows repo (dev only). */
	@Env('INSTANCE_PULL_GH_OWNER')
	ghOwner: string = '';

	/** GitHub repo name of the production-workflows repo (dev only). */
	@Env('INSTANCE_PULL_GH_REPO')
	ghRepo: string = '';

	/** GitHub personal access token used for git HTTPS auth and the PR API (dev only). */
	@Env('INSTANCE_PULL_GH_TOKEN')
	ghToken: string = '';
}
