import { watch } from 'vue';
import type { InstanceAiModelCredential } from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

export function useInstanceCredentialEditor(options: {
	credentials: () => InstanceAiModelCredential[];
	refresh: () => Promise<void>;
	onClosed: (created?: InstanceAiModelCredential) => void;
}) {
	const uiStore = useUIStore();

	let tracking = false;
	let creating = false;
	let previousIds = new Set<string>();

	function createCredential(credentialType: string) {
		tracking = true;
		creating = true;
		previousIds = new Set(options.credentials().map((credential) => credential.id));
		uiStore.openNewCredential(
			credentialType,
			false,
			false,
			undefined,
			undefined,
			undefined,
			undefined,
			{ availability: 'instance', closeOnSave: true, hideAskAssistant: true },
		);
	}

	function editCredential(credentialId: string) {
		tracking = true;
		creating = false;
		uiStore.openExistingCredential(credentialId, { hideAskAssistant: true });
	}

	// Not isModalActiveById: that is topmost-only, so a stacked modal would read as a close.
	watch(
		() => uiStore.activeModals.includes(CREDENTIAL_EDIT_MODAL_KEY),
		async (isOpen, wasOpen) => {
			if (!wasOpen || isOpen || !tracking) return;
			tracking = false;
			await options.refresh();
			const created = creating
				? options.credentials().find((credential) => !previousIds.has(credential.id))
				: undefined;
			creating = false;
			options.onClosed(created);
		},
	);

	return { createCredential, editCredential };
}
