import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AgentVersionMetadataModal, {
	type AgentVersionMetadataModalData,
} from '../components/AgentVersionMetadataModal.vue';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

const closeModal = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ modalsById: { metadata: { open: true } }, closeModal }),
}));

function render(data: Partial<AgentVersionMetadataModalData> = {}) {
	const onSubmit = vi.fn().mockResolvedValue(true);
	const onClose = vi.fn();
	const wrapper = mount(AgentVersionMetadataModal, {
		props: { modalName: 'metadata', data: { mode: 'edit', onSubmit, onClose, ...data } },
		global: { stubs: { AgentModal: AgentModalTestStub } },
	});
	return { wrapper, onSubmit, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('AgentVersionMetadataModal', () => {
	it('reuses optional workflow fields and their character limits', () => {
		const { wrapper } = render({ name: 'Release', description: 'First line\nSecond line' });
		expect(wrapper.findComponent(WorkflowVersionForm).props('nameRequired')).toBe(false);
		expect(wrapper.get('input').attributes('maxlength')).toBe('128');
		expect(wrapper.get('textarea').attributes('maxlength')).toBe('2048');
		expect(wrapper.get('input').element.value).toBe('Release');
		expect(wrapper.get('textarea').element.value).toBe('First line\nSecond line');
	});

	it('saves empty fields as null and closes silently', async () => {
		const { wrapper, onSubmit, onClose } = render({ name: 'Release', description: 'Notes' });
		await wrapper.get('input').setValue('  ');
		await wrapper.get('textarea').setValue('');
		await wrapper.get('[data-testid="agent-version-metadata-submit"]').trigger('click');
		await flushPromises();
		expect(onSubmit).toHaveBeenCalledWith({ name: null, description: null });
		expect(closeModal).toHaveBeenCalledWith('metadata');
		expect(onClose).toHaveBeenCalledWith(true);
	});

	it.each(['agent-modal-cancel', 'dialog-close-button'])(
		'cancels with %s without saving',
		async (testId) => {
			const { wrapper, onSubmit, onClose } = render();
			await wrapper.get('input').setValue('Unsaved name');
			await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onClose).toHaveBeenCalledWith(false);
		},
	);

	it('retains fields after failure and submits them on retry', async () => {
		const { wrapper, onSubmit } = render({ mode: 'publish' });
		onSubmit.mockResolvedValueOnce(false);
		await wrapper.get('input').setValue('Release');
		await wrapper.get('textarea').setValue('One\nTwo');
		await wrapper.get('[data-testid="agent-version-metadata-submit"]').trigger('click');
		await flushPromises();
		expect(closeModal).not.toHaveBeenCalled();
		expect(wrapper.get('textarea').element.value).toBe('One\nTwo');
		await wrapper.get('[data-testid="agent-version-metadata-submit"]').trigger('click');
		await flushPromises();
		expect(onSubmit).toHaveBeenLastCalledWith({ name: 'Release', description: 'One\nTwo' });
		expect(closeModal).toHaveBeenCalledOnce();
	});

	it.each([{ name: 'n'.repeat(129) }, { description: 'd'.repeat(2049) }])(
		'shows inline errors for oversized metadata',
		async (data) => {
			const { wrapper, onSubmit } = render(data);
			await wrapper.get('[data-testid="agent-version-metadata-submit"]').trigger('click');
			expect(wrapper.get('[role="alert"]').text()).toContain('128');
			expect(onSubmit).not.toHaveBeenCalled();
		},
	);

	it('blocks duplicate submission and dismissal while saving', async () => {
		let finish!: (saved: boolean) => void;
		const onSubmit = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					finish = resolve;
				}),
		);
		const { wrapper, onClose } = render({ onSubmit });
		await wrapper.get('[data-testid="agent-version-metadata-submit"]').trigger('click');
		expect(wrapper.findComponent(AgentModalTestStub).props('busy')).toBe(true);
		wrapper.findComponent(WorkflowVersionForm).vm.$emit('submit');
		wrapper.findComponent(AgentModalTestStub).vm.$emit('update:open', false);
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(onClose).not.toHaveBeenCalled();
		finish(true);
		await flushPromises();
		expect(onClose).toHaveBeenCalledWith(true);
	});
});
