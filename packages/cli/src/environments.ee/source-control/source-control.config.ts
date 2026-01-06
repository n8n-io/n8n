import { Config, Env } from '@n8n/config';

@Config
export class SourceControlConfig {
	/** Default SSH key type to use when generating SSH keys. */
	@Env('N8N_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE')
	defaultKeyPairType: 'ed25519' | 'rsa' = 'ed25519';

	/**
	 * Git repository URL for source control.
	 */
	@Env('N8N_SOURCECONTROL_REPOSITORY_URL')
	repositoryUrl: string = '';

	/**
	 * Username for HTTPS authentication.
	 */
	@Env('N8N_SOURCECONTROL_HTTPS_USERNAME')
	httpsUsername: string = '';

	/**
	 * Password or Personal Access Token for HTTPS authentication.
	 */
	@Env('N8N_SOURCECONTROL_HTTPS_PASSWORD')
	httpsPassword: string = '';

	/**
	 * Git branch name to use for source control.
	 * Defaults to 'main' if not specified.
	 */
	@Env('N8N_SOURCECONTROL_BRANCH_NAME')
	branchName: string = 'main';

	/**
	 * Whether the source control branch should be read-only.
	 * When true, prevents pushing changes to the remote repository.
	 */
	@Env('N8N_SOURCECONTROL_BRANCH_READONLY')
	branchReadOnly: boolean = false;
}
