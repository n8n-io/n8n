import type { ServiceAccount } from '@n8n/api-types';

/** Falls back to the synthesized email so a row never renders nameless. */
export function getServiceAccountDisplayName(serviceAccount: ServiceAccount): string {
	return serviceAccount.name ?? serviceAccount.email ?? serviceAccount.id;
}
