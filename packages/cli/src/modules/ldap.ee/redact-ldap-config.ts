import type { LdapConfig } from '@n8n/constants';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

export function redactLdapConfig(config: LdapConfig): LdapConfig {
	return {
		...config,
		bindingAdminPassword: config.bindingAdminPassword ? CREDENTIAL_BLANKING_VALUE : '',
	};
}
