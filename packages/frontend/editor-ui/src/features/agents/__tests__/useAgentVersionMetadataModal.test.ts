import { effectScope, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentVersionMetadataModalData } from '../components/AgentVersionMetadataModal.vue';
import { useAgentVersionMetadataModal } from '../composables/useAgentVersionMetadataModal';
import { AGENT_VERSION_METADATA_MODAL_KEY } from '../constants';

const mocks = vi.hoisted(() => ({ openModalWithData: vi.fn(), closeModal: vi.fn() }));
vi.mock('@/app/stores/ui.store', () => ({ useUIStore: () => mocks }));

function setup() {
	const scope = effectScope();
	const modal = scope.run(useAgentVersionMetadataModal)!;
	const data = () =>
		mocks.openModalWithData.mock.lastCall![0].data as AgentVersionMetadataModalData;
	return { scope, ...modal, data };
}

describe('useAgentVersionMetadataModal', () => {
	beforeEach(() => vi.clearAllMocks());

	it('cancels when the selected agent changes and rejects the old submit callback', async () => {
		const { scope, openVersionMetadata, data } = setup();
		const agentId = ref('a1');
		const onSubmit = vi.fn().mockResolvedValue(true);
		const pending = openVersionMetadata({
			mode: 'publish',
			onSubmit,
			isCurrent: () => agentId.value === 'a1',
		});
		const dialog = data();
		agentId.value = 'a2';
		expect(await pending).toBe(false);
		expect(mocks.closeModal).toHaveBeenCalledWith(AGENT_VERSION_METADATA_MODAL_KEY);
		expect(await dialog.onSubmit({ name: 'Release' })).toBe(false);
		expect(onSubmit).not.toHaveBeenCalled();
		scope.stop();
	});

	it('cancels on unmount and does not open a dialog after a late response', async () => {
		const { scope, openVersionMetadata } = setup();
		const options = { mode: 'edit' as const, onSubmit: vi.fn() };
		const pending = openVersionMetadata(options);
		scope.stop();
		expect(await pending).toBe(false);
		expect(await openVersionMetadata(options)).toBe(false);
		expect(mocks.openModalWithData).toHaveBeenCalledTimes(1);
	});

	it('does not close a new dialog when a cancelled submission completes', async () => {
		const { scope, openVersionMetadata, data } = setup();
		const save = Promise.withResolvers<boolean>();
		const old = openVersionMetadata({ mode: 'edit', onSubmit: async () => await save.promise });
		const submission = data().onSubmit({ name: 'Old release' });
		const current = openVersionMetadata({ mode: 'edit', onSubmit: vi.fn() });
		expect(await old).toBe(false);
		save.resolve(true);
		expect(await submission).toBe(false);
		data().onClose(true);
		expect(await current).toBe(true);
		scope.stop();
	});
});
