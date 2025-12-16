import { Config, Env } from '../decorators';

@Config
export class MfaConfig {
	/** Whether to enable multi-factor authentication. */
	@Env('N8N_MFA_ENABLED')
	enabled: boolean = true;
}
