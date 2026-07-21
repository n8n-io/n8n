import { ref, watch, type Ref } from 'vue';
import type { InstanceAiModelCredential } from '@n8n/api-types';
import { useInstanceCredentialEditor } from './useInstanceCredentialEditor';

export function useInstanceCredentialDialog(options: {
	open: Ref<boolean>;
	current: () => string;
	hydrate: () => void;
	credentials: () => InstanceAiModelCredential[];
	refresh: () => Promise<void>;
	onCreated?: (credential: InstanceAiModelCredential) => void;
}) {
	const { open } = options;
	const credentialId = ref('');
	// Set while the credential modal is open on top, so reopening restores unsaved edits.
	let skipNextHydrate = false;

	watch(
		open,
		(isOpen) => {
			if (!isOpen) return;
			if (skipNextHydrate) {
				skipNextHydrate = false;
				return;
			}
			credentialId.value = options.current();
			options.hydrate();
		},
		{ immediate: true },
	);

	const { createCredential, editCredential } = useInstanceCredentialEditor({
		credentials: options.credentials,
		refresh: options.refresh,
		onClosed: (created) => {
			if (created) {
				if (options.onCreated) options.onCreated(created);
				else credentialId.value = created.id;
			} else if (
				credentialId.value &&
				!options.credentials().some((credential) => credential.id === credentialId.value)
			) {
				credentialId.value = '';
			}
			open.value = true;
		},
	});

	function holdForCredentialModal() {
		skipNextHydrate = true;
		open.value = false;
	}

	function openCreate(credentialType: string) {
		holdForCredentialModal();
		createCredential(credentialType);
	}

	function openEdit() {
		if (!credentialId.value) return;
		holdForCredentialModal();
		editCredential(credentialId.value);
	}

	return { credentialId, openCreate, openEdit };
}
