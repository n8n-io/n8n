/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AgentSubAgentsModal from '../components/AgentSubAgentsModal.vue';

const closeModalMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			({
				'agents.builder.subAgents.modal.title': 'Sub-agents',
				'agents.builder.subAgents.modal.description': 'Select published agents',
				'agents.builder.subAgents.modal.selectAgent': `Select ${options?.interpolate?.name ?? ''}`,
				'agents.builder.subAgents.modal.empty.title': 'No agents to add',
				'agents.builder.subAgents.modal.empty.description': 'Published agents show here',
				'agents.builder.subAgents.modal.search.placeholder': 'Search agents',
				'agents.builder.subAgents.modal.noResults.title': 'No matching agents',
				'agents.builder.subAgents.modal.noResults.description': 'Try another search term.',
				'agents.builder.subAgents.modal.add': 'Add agent',
				'agents.builder.subAgents.modal.remove': 'Remove sub agent',
				'agents.builder.subAgents.useWhen.label': 'When should this agent be used?',
				'agents.builder.subAgents.useWhen.hint': 'Tell the parent agent when to delegate work.',
				'agents.builder.subAgents.useWhen.placeholder': 'Use for billing questions',
				'agents.builder.subAgents.useWhen.characterCount': '0/512',
				'agents.builder.subAgents.useWhen.validation.maxLength': `Use when must be ${options?.interpolate?.max ?? ''} characters or less`,
				'generic.back': 'Back',
				'generic.cancel': 'Cancel',
				'generic.save': 'Save',
			})[key] ?? key,
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ closeModal: closeModalMock }),
}));

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		name: 'Modal',
		props: ['name', 'width', 'customClass'],
		template:
			'<section><header><slot name="header" /></header><main><slot name="content" /></main><footer><slot name="footer" /></footer></section>',
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nActionBox: {
		props: ['heading', 'description'],
		template: '<div v-bind="$attrs">{{ heading }} {{ description }}</div>',
	},
	N8nButton: {
		props: ['variant', 'size', 'disabled'],
		emits: ['click'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nHeading: { template: '<h2><slot /></h2>', props: ['tag', 'size'] },
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
	N8nInput: {
		props: ['modelValue', 'placeholder', 'clearable', 'size'],
		emits: ['update:modelValue'],
		template:
			'<input v-bind="$attrs" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	N8nMarkdownEditor: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	N8nScrollArea: { template: '<div><slot /></div>', props: ['maxHeight', 'type'] },
	N8nText: { template: '<span><slot /></span>', props: ['size', 'color', 'bold'] },
}));

describe('AgentSubAgentsModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('configures useWhen before adding a single agent', async () => {
		const onConfirm = vi.fn();
		const wrapper = mount(AgentSubAgentsModal, {
			props: {
				modalName: 'agentSubAgentsModal',
				data: {
					agents: [
						{ id: 'agent-2', name: 'Billing Agent' },
						{ id: 'agent-3', name: 'Research Agent' },
					],
					onConfirm,
				},
			},
		});

		const addButtons = wrapper.findAll('[data-testid="agent-sub-agents-modal-add"]');
		expect(addButtons).toHaveLength(2);
		expect(addButtons[0].text()).toBe('Add agent');

		await addButtons[1].trigger('click');

		expect(wrapper.find('h2').text()).toBe('Research Agent');
		const confirmButton = wrapper.find('[data-testid="agent-sub-agents-modal-confirm"]');
		expect(confirmButton.attributes('disabled')).toBeUndefined();

		await wrapper.find('[data-testid="agent-sub-agents-modal-use-when"]').setValue('a'.repeat(513));
		expect(
			wrapper.find('[data-testid="agent-sub-agents-modal-confirm"]').attributes('disabled'),
		).toBeDefined();

		await wrapper
			.find('[data-testid="agent-sub-agents-modal-use-when"]')
			.setValue('Use for deep research and source synthesis.');
		await confirmButton.trigger('click');

		expect(onConfirm).toHaveBeenCalledWith({
			agentId: 'agent-3',
			useWhen: 'Use for deep research and source synthesis.',
		});
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(closeModalMock).toHaveBeenCalledWith('agentSubAgentsModal');
	});

	it('adds a sub-agent without useWhen guidance', async () => {
		const onConfirm = vi.fn();
		const wrapper = mount(AgentSubAgentsModal, {
			props: {
				modalName: 'agentSubAgentsModal',
				data: {
					agents: [{ id: 'agent-2', name: 'Billing Agent' }],
					onConfirm,
				},
			},
		});

		await wrapper.find('[data-testid="agent-sub-agents-modal-add"]').trigger('click');

		const confirmButton = wrapper.find('[data-testid="agent-sub-agents-modal-confirm"]');
		expect(confirmButton.attributes('disabled')).toBeUndefined();
		await confirmButton.trigger('click');

		expect(onConfirm).toHaveBeenCalledWith({ agentId: 'agent-2' });
		expect(closeModalMock).toHaveBeenCalledWith('agentSubAgentsModal');
	});

	it('filters available agents by name before configuring one', async () => {
		const wrapper = mount(AgentSubAgentsModal, {
			props: {
				modalName: 'agentSubAgentsModal',
				data: {
					agents: [
						{ id: 'agent-2', name: 'Billing Agent' },
						{ id: 'agent-3', name: 'Research Agent' },
					],
					onConfirm: vi.fn(),
				},
			},
		});

		const searchInput = wrapper.find('[data-testid="agent-sub-agents-modal-search"]');
		expect(searchInput.exists()).toBe(true);

		await searchInput.setValue(' bill ');

		let rows = wrapper.findAll('[data-testid="agent-sub-agents-modal-row"]');
		expect(rows).toHaveLength(1);
		expect(rows[0].text()).toContain('Billing Agent');
		expect(wrapper.findAll('[data-testid="agent-sub-agents-modal-add"]')).toHaveLength(1);

		await searchInput.setValue('unknown');

		expect(wrapper.find('[data-testid="agent-sub-agents-modal-no-results"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-sub-agents-modal-empty"]').exists()).toBe(false);
		expect(wrapper.findAll('[data-testid="agent-sub-agents-modal-add"]')).toHaveLength(0);

		await searchInput.setValue('RESEARCH');
		rows = wrapper.findAll('[data-testid="agent-sub-agents-modal-row"]');
		expect(rows).toHaveLength(1);
		expect(rows[0].text()).toContain('Research Agent');

		await wrapper.find('[data-testid="agent-sub-agents-modal-add"]').trigger('click');

		expect(wrapper.find('h2').text()).toBe('Research Agent');
	});

	it('returns to the list from the configure step', async () => {
		const wrapper = mount(AgentSubAgentsModal, {
			props: {
				modalName: 'agentSubAgentsModal',
				data: {
					agents: [{ id: 'agent-2', name: 'Billing Agent' }],
					onConfirm: vi.fn(),
				},
			},
		});

		await wrapper.find('[data-testid="agent-sub-agents-modal-add"]').trigger('click');
		expect(wrapper.find('h2').text()).toBe('Billing Agent');

		await wrapper.find('[data-testid="agent-sub-agents-modal-back"]').trigger('click');

		expect(wrapper.find('h2').text()).toBe('Sub-agents');
		expect(wrapper.findAll('[data-testid="agent-sub-agents-modal-add"]')).toHaveLength(1);
	});

	it('edits an existing sub-agent useWhen and removes it', async () => {
		const onConfirm = vi.fn();
		const onRemove = vi.fn();
		const wrapper = mount(AgentSubAgentsModal, {
			props: {
				modalName: 'agentSubAgentsModal',
				data: {
					selectedAgent: { id: 'agent-2', name: 'Billing Agent' },
					useWhen: 'Use for invoice questions.',
					onConfirm,
					onRemove,
				},
			},
		});

		expect(wrapper.find('h2').text()).toBe('Billing Agent');
		expect(wrapper.find('[data-testid="agent-sub-agents-modal-back"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-sub-agents-modal-use-when"]').element).toHaveProperty(
			'value',
			'Use for invoice questions.',
		);

		await wrapper.find('[data-testid="agent-sub-agents-modal-use-when"]').setValue('');
		await wrapper.find('[data-testid="agent-sub-agents-modal-confirm"]').trigger('click');

		expect(onConfirm).toHaveBeenCalledWith({ agentId: 'agent-2' });
		expect(closeModalMock).toHaveBeenCalledWith('agentSubAgentsModal');

		closeModalMock.mockClear();
		await wrapper.find('[data-testid="agent-sub-agents-modal-remove"]').trigger('click');

		expect(onRemove).toHaveBeenCalledWith('agent-2');
		expect(closeModalMock).toHaveBeenCalledWith('agentSubAgentsModal');
	});

	it('shows an empty state when no agents are available', () => {
		const wrapper = mount(AgentSubAgentsModal, {
			props: {
				modalName: 'agentSubAgentsModal',
				data: {
					agents: [],
					onConfirm: vi.fn(),
				},
			},
		});

		expect(wrapper.find('[data-testid="agent-sub-agents-modal-empty"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-sub-agents-modal-add"]').exists()).toBe(false);
	});
});
