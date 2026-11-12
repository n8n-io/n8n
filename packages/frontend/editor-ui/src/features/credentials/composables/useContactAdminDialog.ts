import type {
	ContactAudience,
	RestrictedTypeKind,
} from '@n8n/frontend-module-type-availability-policies';
import { ref } from 'vue';

export function useContactAdminDialog(closeList: () => void) {
	const isOpen = ref(false);
	// The dialog keeps showing this copy while it fades out, so it stays set after the close.
	const state = ref<{ subject: string; kind: RestrictedTypeKind; audience: ContactAudience }>({
		subject: '',
		kind: 'credential',
		audience: 'instance',
	});

	function request(
		subject: string,
		audience: ContactAudience,
		kind: RestrictedTypeKind = 'credential',
	) {
		// The dialog opens on top of the page, so the list must not stay open behind it.
		closeList();
		state.value = { subject, kind, audience };
		isOpen.value = true;
	}

	return { isOpen, state, request };
}
