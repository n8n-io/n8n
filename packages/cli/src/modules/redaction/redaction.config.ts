import { Config, Env } from '@n8n/config';

@Config
export class RedactionConfig {
	/** Whether the workflow redaction policy is enforced at the instance level. When on, the policy cannot be modified through any workflow update path. */
	@Env('N8N_ENV_FEAT_REDACTION_ENFORCEMENT')
	enforcement: boolean = false;
}
