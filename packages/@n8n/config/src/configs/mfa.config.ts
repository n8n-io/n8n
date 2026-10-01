import { Config, Env } from '../decorators';

@Config
export class MfaConfig {
	/** Whether multi-factor authentication (MFA) is enabled for the instance. */
	@Env('N8N_MFA_ENABLED')
	enabled: boolean = true;
}
