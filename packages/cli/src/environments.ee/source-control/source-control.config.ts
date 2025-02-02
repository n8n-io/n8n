import { Config, Env } from '@n8n/config';

@Config
export class SourceControlConfig {
	/** Default SSH key type to use when generating SSH keys. */
	@Env('N8N_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE')
	defaultKeyPairType: 'ed25519' | 'rsa' = 'ed25519';
}
