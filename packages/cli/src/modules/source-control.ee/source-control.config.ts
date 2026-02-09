import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const connectionTypeSchema = z.enum(['ssh', 'https']);

@Config
export class SourceControlConfig {
	/** Default SSH key type to use when generating SSH keys. */
	@Env('N8N_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE')
	defaultKeyPairType: 'ed25519' | 'rsa' = 'ed25519';

	/** Git repository URL for auto-configuration (e.g. git@github.com:org/repo.git). */
	@Env('N8N_SOURCECONTROL_REPO_URL')
	repositoryUrl: string = '';

	/** Branch name to use. Only applied during auto-configuration. */
	@Env('N8N_SOURCECONTROL_BRANCH')
	branch: string = 'main';

	/** Whether the branch is read-only (pull only, no push). */
	@Env('N8N_SOURCECONTROL_BRANCH_READ_ONLY')
	branchReadOnly: boolean = false;

	/**
	 * SSH private key for git authentication.
	 * Supports the `_FILE` suffix pattern (e.g. N8N_SOURCECONTROL_SSH_KEY_FILE=/run/secrets/key)
	 * for Docker/Kubernetes secrets.
	 */
	@Env('N8N_SOURCECONTROL_SSH_KEY')
	sshKey: string = '';

	/** Connection type: 'ssh' or 'https'. */
	@Env('N8N_SOURCECONTROL_CONNECTION_TYPE', connectionTypeSchema)
	connectionType: 'ssh' | 'https' = 'ssh';

	/** Whether to automatically pull from git on startup after connecting. */
	@Env('N8N_SOURCECONTROL_AUTO_PULL_ON_STARTUP')
	autoPullOnStartup: boolean = false;

	/** Whether to fail startup if auto-pull encounters an error. */
	@Env('N8N_SOURCECONTROL_FAIL_ON_PULL_ERROR')
	failOnPullError: boolean = false;
}
