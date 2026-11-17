import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { reactive } from 'vue';

// Shared by every caller: the shell loads the credential types once for the session.
const names = reactive(new Map<string, string>());
const requested = new Set<string>();

/**
 * The display name of a credential type, such as "HubSpot API" for `hubspotApi`. The shell
 * owns the credential types, so the name arrives after the first render. Until then, and for
 * a type that this instance does not know, the raw type name stands in.
 */
export function useCredentialTypeNames() {
	const editors = capabilityRegistry.use(capabilities.resourceEditors);

	function credentialTypeName(type: string): string {
		if (!requested.has(type)) {
			requested.add(type);
			void editors
				.credentialTypeName?.(type)
				.then((name) => {
					if (name) names.set(type, name);
				})
				// The raw type name stays. A next page load asks again.
				.catch(() => requested.delete(type));
		}
		return names.get(type) ?? type;
	}

	return { credentialTypeName };
}
