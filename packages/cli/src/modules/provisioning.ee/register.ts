import { Container } from '@n8n/di';

import { SsoProvisioningHooks } from '@/sso.ee/sso-provisioning-hooks';

import { SsoProvisioningHandlerService } from './sso-provisioning.handler.ee';

/**
 * Hooks this module into SAML/OIDC logins. Runs on module init, so the SSO
 * hooks no-op — matching provisioning's default all-disabled configuration —
 * exactly when this module is disabled.
 */
export function registerSsoProvisioningHandler() {
	Container.get(SsoProvisioningHooks).registerHandler(Container.get(SsoProvisioningHandlerService));
}
