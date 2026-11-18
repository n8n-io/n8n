import { readonly, ref } from 'vue';
import type { INodeProperties } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getVaultStatus } from '../credentials.api';

// One answer for the whole session. The setting only changes with the server configuration.
const vaultEnabled = ref(false);
let statusRequest: Promise<void> | undefined;

/** A secret field is one the editor masks. In vault mode the vault holds these fields. */
export function isSecretProperty(property: INodeProperties): boolean {
	return property.typeOptions?.password === true;
}

/** Tells whether secrets are entered in the vault instead of in the credential form. */
export function useVaultCredentials() {
	const rootStore = useRootStore();

	statusRequest ??= getVaultStatus(rootStore.restApiContext)
		.then((status) => {
			vaultEnabled.value = status.enabled;
		})
		.catch(() => {
			vaultEnabled.value = false;
		});

	return { vaultEnabled: readonly(vaultEnabled) };
}

/** Lets a test start from a clean state. */
export function resetVaultCredentialsStatus() {
	statusRequest = undefined;
	vaultEnabled.value = false;
}
