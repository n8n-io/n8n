import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type {
	SetupTask,
	SetupTaskId,
} from '../components/AgentSetupTasks/agentSetupTasks.registry';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: {
		template: '<i :data-icon="icon" />',
		props: ['icon'],
	},
	N8nText: {
		template: '<component :is="tag ?? \'span\'"><slot /></component>',
		props: ['tag'],
	},
	N8nToggle: {
		template:
			'<button data-testid="minimise-toggle" :data-icon="icon" :aria-label="label" @click="$emit(\'click\', $event)" />',
		props: ['icon', 'label'],
		emits: ['click'],
	},
}));

import AgentSetupTasks from '../components/AgentSetupTasks/AgentSetupTasks.vue';

const tasks: Array<SetupTask<SetupTaskId>> = [
	{
		id: 'choose-model',
		titleKey: 'agents.builder.setupTasks.chooseModel',
		required: true,
		state: 'complete',
		visible: true,
		action: {
			labelKey: 'agents.builder.setupTasks.chooseModel',
			target: { kind: 'agent' },
			path: 'model',
		},
	},
	{
		id: 'add-tool',
		titleKey: 'agents.builder.tools.add',
		required: false,
		state: 'todo',
		visible: false,
		action: {
			labelKey: 'agents.builder.tools.add',
			target: { kind: 'tool' },
		},
	},
	{
		id: 'add-instructions',
		titleKey: 'agents.builder.setupTasks.addInstructions',
		required: true,
		state: 'todo',
		visible: true,
		action: {
			labelKey: 'agents.builder.setupTasks.addInstructions',
			target: { kind: 'agent' },
			path: 'instructions',
		},
	},
];

describe('AgentSetupTasks', () => {
	it('only shows visible tasks', () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });

		expect(wrapper.findAll('li')).toHaveLength(2);
		expect(wrapper.text()).toContain('agents.builder.setupTasks.chooseModel');
		expect(wrapper.text()).toContain('agents.builder.setupTasks.addInstructions');
		expect(wrapper.text()).not.toContain('agents.builder.tools.add');
	});

	it('puts completed tasks last', () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		const taskItems = wrapper.findAll('li');

		expect(taskItems[0].text()).toContain('agents.builder.setupTasks.addInstructions');
		expect(taskItems[1].text()).toContain('agents.builder.setupTasks.chooseModel');
	});

	it('toggles the minimised state', async () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		const container = wrapper.get('[data-testid="agent-setup-tasks"]');
		const toggle = wrapper.get('[data-testid="minimise-toggle"]');

		expect(container.classes()).not.toContain('isMinimised');
		expect(toggle.attributes('data-icon')).toBe('chevron-down');
		expect(toggle.attributes('aria-label')).toBe('agents.builder.setupTasks.minimize');

		await toggle.trigger('click');

		expect(container.classes()).toContain('isMinimised');
		expect(toggle.attributes('data-icon')).toBe('chevron-up');
		expect(toggle.attributes('aria-label')).toBe('agents.builder.setupTasks.maximize');
		expect(wrapper.get('ul').attributes()).toHaveProperty('inert');
		expect(wrapper.find('[data-testid="agent-setup-tasks-peek-trigger"]').exists()).toBe(true);
	});

	it('enables the peek when the pointer enters the peek trigger', async () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		const container = wrapper.get('[data-testid="agent-setup-tasks"]');

		await wrapper.get('[data-testid="minimise-toggle"]').trigger('click');
		await wrapper.get('[data-testid="agent-setup-tasks-peek-trigger"]').trigger('pointerenter');

		expect(container.classes()).toContain('isPeekEnabled');
	});

	it('maximises the panel when the user clicks its peeked header', async () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		const container = wrapper.get('[data-testid="agent-setup-tasks"]');

		await wrapper.get('[data-testid="minimise-toggle"]').trigger('click');
		await wrapper.get('[data-testid="agent-setup-tasks-header"]').trigger('click');

		expect(container.classes()).not.toContain('isMinimised');
		expect(container.classes()).not.toContain('isPeekEnabled');
		expect(wrapper.find('[data-testid="agent-setup-tasks-peek-trigger"]').exists()).toBe(false);
	});
});
