import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import { i18nInstance } from '@n8n/i18n';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { AGENT_N8N_CHAT_VIEW } from '../constants';
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

function createTestRouter() {
	const page = defineComponent({ template: '<div />' });
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: page },
			{
				name: AGENT_N8N_CHAT_VIEW,
				path: '/assistant/agents/:agentId/:agentThreadId?',
				component: page,
			},
		],
	});
}

const n8nChatAgentId = 'agent-1';

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
		global: {
			plugins: [i18nInstance, createTestRouter()],
			stubs: { AgentModal: stubModal ? AgentModalTestStub : false },
		},
	});

	return { wrapper, onSubmit, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('AgentVersionMetadataModal', () => {
	const PUBLISH_CALLOUT = '[data-testid="agent-version-metadata-publish-callout"]';
	const PUBLISH_AND_TALK = '[data-testid="agent-version-metadata-publish-and-talk"]';
	const SUBMIT = '[data-testid="agent-version-metadata-submit"]';

	it.each([undefined, n8nChatAgentId])(
		'tells the user that later changes need another publish (n8nChatAgentId %s)',
		(agentId) => {
			const { wrapper } = render({ mode: 'publish', n8nChatAgentId: agentId });

			expect(wrapper.get(PUBLISH_CALLOUT).text()).toBe(
				'Any changes you make to this agent will not be published until you publish it again.',
			);
		},
	);

	it('shows no publish callout when the user only names a version', () => {
		const { wrapper } = render({ mode: 'edit', n8nChatAgentId });

		expect(wrapper.find(PUBLISH_CALLOUT).exists()).toBe(false);
	});

	it.each([
		{ mode: 'publish' as const, n8nChatAgentId: undefined },
		{ mode: 'edit' as const, n8nChatAgentId },
	])(
		'shows no "Publish and talk to agent" in $mode mode with n8nChatAgentId $n8nChatAgentId',
		({ mode, n8nChatAgentId: agentId }) => {
			const { wrapper } = render({ mode, n8nChatAgentId: agentId });

			expect(wrapper.find(PUBLISH_AND_TALK).exists()).toBe(false);
		},
	);

	describe('"Publish and talk to agent"', () => {
		function stubWindowOpen() {
			const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
			const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
			return { tab, open };
		}

		afterEach(() => vi.restoreAllMocks());

		it('moves Cancel to the left of the footer', async () => {
			const { wrapper, onClose } = render({ mode: 'publish', n8nChatAgentId }, false);
			await flushPromises();

			const footerActions = document.querySelector('[data-testid="agent-modal-footer-actions"]');
			const cancel = document.querySelector<HTMLButtonElement>(
				'[data-testid="agent-version-metadata-cancel"]',
			);
			expect(cancel).not.toBeNull();
			expect(footerActions?.contains(cancel)).toBe(false);
			expect(document.querySelector('[data-testid="agent-modal-cancel"]')).toBeNull();

			cancel?.click();
			await flushPromises();
			expect(onClose).toHaveBeenCalledWith(false);
			wrapper.unmount();
		});

		it('keeps Cancel on the right without n8n Chat', async () => {
			render({ mode: 'publish' }, false);
			await flushPromises();

			expect(document.querySelector('[data-testid="agent-version-metadata-cancel"]')).toBeNull();
			expect(document.querySelector('[data-testid="agent-modal-cancel"]')).not.toBeNull();
		});

		it('demotes Publish to a secondary button', () => {
			const { wrapper } = render({ mode: 'publish', n8nChatAgentId });

			expect(wrapper.get(PUBLISH_AND_TALK).text()).toBe('Publish and talk to agent');
			expect(wrapper.get(SUBMIT).attributes('class')).toContain('outline');
		});

		it('publishes, then opens the agent in n8n Chat in a new tab', async () => {
			const { tab, open } = stubWindowOpen();
			const { wrapper, onSubmit, onClose } = render({ mode: 'publish', n8nChatAgentId });

			await wrapper.get(PUBLISH_AND_TALK).trigger('click');
			await flushPromises();

			expect(open).toHaveBeenCalledWith('', '_blank');
			expect(tab.opener).toBeNull();
			expect(onSubmit).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledWith(true);
			expect(tab.location.href).toBe('/assistant/agents/agent-1');
			expect(tab.close).not.toHaveBeenCalled();
		});

		it('closes the new tab when the publish fails', async () => {
			const { tab } = stubWindowOpen();
			const { wrapper, onSubmit, onClose } = render({ mode: 'publish', n8nChatAgentId });
			onSubmit.mockResolvedValueOnce(false);

			await wrapper.get(PUBLISH_AND_TALK).trigger('click');
			await flushPromises();

			expect(onClose).not.toHaveBeenCalled();
			expect(tab.location.href).toBe('');
			expect(tab.close).toHaveBeenCalledOnce();
		});

		it('opens no tab when Publish is used', async () => {
			const { open } = stubWindowOpen();
			const { wrapper, onSubmit } = render({ mode: 'publish', n8nChatAgentId });

			await wrapper.get(SUBMIT).trigger('click');
			await flushPromises();

			expect(onSubmit).toHaveBeenCalledOnce();
			expect(open).not.toHaveBeenCalled();
		});
	});

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
