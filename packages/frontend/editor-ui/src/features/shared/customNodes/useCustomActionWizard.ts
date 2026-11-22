import type { CustomActionWizardData } from '@n8n/frontend-module-custom-nodes';
import { ref } from 'vue';

// One wizard for the whole editor. `CustomActionWizardHost` renders it with this state.
const isOpen = ref(false);
const data = ref<CustomActionWizardData>({ mode: 'create' });

/** Opens the wizard for custom nodes and custom actions from an entry point of the editor. */
export function useCustomActionWizard() {
	function open(next: CustomActionWizardData) {
		data.value = next;
		isOpen.value = true;
	}

	return { isOpen, data, open };
}
