import { Config, Env } from '@n8n/config';

@Config
export class RuntimeCredentialsConfig {
	@Env('N8N_SECURITY_SENSITIVE_FIELD_RULES')
	sensitiveFieldRules: string = '{}';
}
