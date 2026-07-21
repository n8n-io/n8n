import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import type { InstanceAiModelCredential } from '@n8n/api-types';
import { useInstanceCredentialDialog } from '../useInstanceCredentialDialog';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

const openExistingCredential = vi.fn();
const uiState = reactive<{ activeModals: string[] }>({ activeModals: [] });

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		get activeModals() {
			return uiState.activeModals;
		},
		openNewCredential: vi.fn(),
		openExistingCredential,
	}),
}));

const cred = (id: string): InstanceAiModelCredential => ({
	id,
	name: id,
	type: 'openAiApi',
	provider: 'openai',
});

describe('useInstanceCredentialDialog', () => {
	let scope: EffectScope;

	beforeEach(() => {
		vi.clearAllMocks();
		uiState.activeModals = [];
	});

	afterEach(() => {
		scope.stop();
	});

	it('clears the selected credential when it is deleted from the edit modal', async () => {
		const open = ref(false);
		let credentials = [cred('cred-1')];
		let dialog!: ReturnType<typeof useInstanceCredentialDialog>;
		scope = effectScope();
		scope.run(() => {
			dialog = useInstanceCredentialDialog({
				open,
				current: () => 'cred-1',
				hydrate: () => {},
				credentials: () => credentials,
				refresh: async () => {
					credentials = [];
				},
			});
		});

		open.value = true;
		await nextTick();
		expect(dialog.credentialId.value).toBe('cred-1');

		dialog.openEdit();
		await nextTick();
		uiState.activeModals = [CREDENTIAL_EDIT_MODAL_KEY];
		await nextTick();
		uiState.activeModals = [];
		await nextTick();

		expect(dialog.credentialId.value).toBe('');
		expect(open.value).toBe(true);
	});
});
