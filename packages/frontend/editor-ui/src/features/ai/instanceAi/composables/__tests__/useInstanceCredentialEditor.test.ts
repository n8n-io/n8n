import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import type { InstanceAiModelCredential } from '@n8n/api-types';
import { useInstanceCredentialEditor } from '../useInstanceCredentialEditor';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

const openNewCredential = vi.fn();
const openExistingCredential = vi.fn();
const uiState = reactive<{ activeModals: string[] }>({ activeModals: [] });

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		get activeModals() {
			return uiState.activeModals;
		},
		openNewCredential,
		openExistingCredential,
	}),
}));

function openModal() {
	uiState.activeModals = [CREDENTIAL_EDIT_MODAL_KEY, ...uiState.activeModals];
}
function stackModal() {
	uiState.activeModals = ['other-modal', ...uiState.activeModals];
}
function closeModal(key: string) {
	uiState.activeModals = uiState.activeModals.filter((m) => m !== key);
}

const cred = (id: string): InstanceAiModelCredential => ({
	id,
	name: id,
	type: 'openAiApi',
	provider: 'openai',
});

describe('useInstanceCredentialEditor', () => {
	let credentials: InstanceAiModelCredential[];
	const refresh = vi.fn(async () => {});
	const onClosed = vi.fn();
	let editor: ReturnType<typeof useInstanceCredentialEditor>;
	let scope: EffectScope;

	beforeEach(() => {
		vi.clearAllMocks();
		uiState.activeModals = [];
		credentials = [cred('existing')];
		scope = effectScope();
		scope.run(() => {
			editor = useInstanceCredentialEditor({
				credentials: () => credentials,
				refresh,
				onClosed,
			});
		});
	});

	afterEach(() => {
		scope.stop();
	});

	it('opens the credential modal as an instance credential and hides the assistant', () => {
		editor.createCredential('openAiApi');
		expect(openNewCredential).toHaveBeenCalledWith(
			'openAiApi',
			false,
			false,
			undefined,
			undefined,
			undefined,
			undefined,
			{ availability: 'instance', closeOnSave: true, hideAskAssistant: true },
		);
	});

	it('reports the newly created credential once the modal closes', async () => {
		editor.createCredential('openAiApi');
		openModal();
		await nextTick();
		credentials = [cred('existing'), cred('new-cred')];
		closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		await nextTick();

		expect(refresh).toHaveBeenCalledOnce();
		expect(onClosed).toHaveBeenCalledWith(cred('new-cred'));
	});

	it('does not fire when a modal stacks on top of the credential modal', async () => {
		editor.createCredential('openAiApi');
		openModal();
		await nextTick();
		stackModal();
		await nextTick();

		expect(onClosed).not.toHaveBeenCalled();

		closeModal('other-modal');
		await nextTick();
		expect(onClosed).not.toHaveBeenCalled();

		closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		await nextTick();
		expect(onClosed).toHaveBeenCalledOnce();
	});

	it('ignores credential-modal activity that this editor did not initiate', async () => {
		openModal();
		await nextTick();
		closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		await nextTick();

		expect(refresh).not.toHaveBeenCalled();
		expect(onClosed).not.toHaveBeenCalled();
	});

	it('does not report a created credential when editing an existing one', async () => {
		editor.editCredential('existing');
		expect(openExistingCredential).toHaveBeenCalledWith('existing', { hideAskAssistant: true });
		openModal();
		await nextTick();
		closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		await nextTick();

		expect(onClosed).toHaveBeenCalledWith(undefined);
	});
});
