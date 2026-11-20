import { Container } from '@n8n/di';

import { ServiceAccountUsageProxy } from '@/services/service-account-usage-proxy.service';

import { AgentServiceAccountUsage } from './agent-service-account-usage';

/** Tells core which agent acts as a service account, so that core never imports this module. */
export function registerServiceAccountUsage(): void {
	Container.get(ServiceAccountUsageProxy).register(Container.get(AgentServiceAccountUsage));
}
