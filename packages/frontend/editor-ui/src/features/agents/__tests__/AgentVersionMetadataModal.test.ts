import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import AgentVersionMetadataModal, {
	type AgentVersionMetadataModalData,
} from '../components/AgentVersionMetadataModal.vue';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

const closeModal = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ modalsById: { metadata: { open: true } }, closeModal }),
}));

enableAutoUnmount(afterEach);

function render(data: Partial<AgentVersionMetadataModalData> = {}, stubModal = true) {
	const onSubmit = vi.fn().mockResolvedValue(true);
	const onClose = vi.fn();
	const wrapper = mount(AgentVersionMetadataModal, {
		attachTo: document.body,
		props: {
			modalName: 'metadata',
			data: {
				mode: 'edit',
				versionId: '044574aa-1234-4567-8901-234567890123',
				onSubmit,
				onClose,
				...data,
			},
		},
		global: { stubs: { AgentModal: stubModal ? AgentModalTestStub : false } },
	});

	return { wrapper, onSubmit, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('AgentVersionMetadataModal', () => {
	it('requires the workflow name field and keeps the character limits', () => {
		const { wrapper } = render({ name: 'Release', description: 'First line\nSecond line' });
		expect(wrapper.findComponent(WorkflowVersionForm).props('nameRequired')).toBe(true);
		expect(wrapper.get('input').attributes('maxlength')).toBe('128');
		expect(wrapper.get('textarea').attributes('maxlength')).toBe('2048');
		expect(wrapper.get('input').element.value).toBe('Release');
		expect(wrapper.get('textarea').element.value).toBe('First line\nSecond line');
	});

	it.each(['edit', 'publish'] as const)('prefills an unnamed version in %s mode', (mode) => {
		const { wrapper } = render({ mode });

		expect(wrapper.get('input').element.value).toBe('Version 044574aa');
	});

	it.each(['edit', 'publish'] as const)(
		'blocks blank names and Enter submission in %s mode',
		async (mode) => {
			const { wrapper, onSubmit } = render({ mode });

			for (const name of ['', '  ']) {
				await wrapper.get('input').setValue(name);

				expect(
					wrapper.get('[data-testid="agent-version-metadata-submit"]').attributes('disabled'),
				).toBeDefined();

				await wrapper.get('input').trigger('keydown', { key: 'Enter' });
			}

			expect(onSubmit).not.toHaveBeenCalled();
			expect(closeModal).not.toHaveBeenCalled();
		},
	);

	it.each(['edit', 'publish'] as const)(
		'selects the full name when the %s dialog opens',
		async (mode) => {
			const { wrapper } = render({ mode, name: 'Release' }, false);
			await flushPromises();

			const form = wrapper.getComponent(WorkflowVersionForm);
			const input = form.get('input').element;

			expect(document.activeElement).toBe(input);
			expect(input.selectionStart).toBe(0);
			expect(input.selectionEnd).toBe('Release'.length);

			input.setSelectionRange(2, 2);
			form.get('textarea').element.focus();
			input.focus();

			expect(input.selectionStart).toBe(2);
			expect(input.selectionEnd).toBe(2);
		},
	);

	it('trims the name and saves an empty description as null', async () => {
		const { wrapper, onSubmit, onClose } = render({ name: 'Release', description: 'Notes' });
		await wrapper.get('input').setValue('  Release  ');
		await wrapper.get('textarea').setValue('');
		await wrapper.get('[data-testid="agent-version-metadata-submit"]').trigger('click');
		await flushPromises();

		expect(onSubmit).toHaveBeenCalledWith({ name: 'Release', description: null });
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
