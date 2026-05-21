import { Config, Env } from '@n8n/config';

@Config
export class InboundSecretsConfig {
	@Env('N8N_SECURITY_SENSITIVE_FIELD_RULES')
	sensitiveFieldRules: string = '{}';
}
