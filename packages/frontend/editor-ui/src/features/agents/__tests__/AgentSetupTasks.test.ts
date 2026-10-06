import { nextTick } from 'vue';
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
	N8nPopover: {
		template:
			'<div><div @click="$emit(\'update:open\', !open)"><slot name="trigger" /></div><div v-if="open"><slot name="content" /></div></div>',
		props: ['open'],
		emits: ['update:open'],
	},
	N8nText: {
		template: '<component :is="tag ?? \'span\'"><slot /></component>',
		props: ['tag'],
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
	it('moves focus with the arrow keys and activates the selected task', async () => {
		const localTasks: Array<SetupTask<SetupTaskId>> = [{ ...tasks[0], state: 'todo' }, tasks[2]];
		const wrapper = mount(AgentSetupTasks, {
			props: { tasks: localTasks },
			attachTo: document.body,
		});
		try {
			await wrapper.get('button').trigger('click');
			await nextTick();

			const taskItems = wrapper.findAll('[role="button"]');
			expect(taskItems[0].attributes('tabindex')).toBe('0');
			expect(document.activeElement).toBe(taskItems[0].element);

			await taskItems[0].trigger('keydown', { key: 'ArrowDown' });
			await nextTick();
			expect(taskItems[0].attributes('data-selected')).toBe('false');
			expect(taskItems[0].attributes('tabindex')).toBe('-1');
			expect(taskItems[1].attributes('data-selected')).toBe('true');
			expect(document.activeElement).toBe(taskItems[1].element);

			await taskItems[1].trigger('keydown', { key: 'Enter' });
			expect(wrapper.emitted('action')?.[0]).toEqual([localTasks[1]]);

			await taskItems[1].trigger('keydown', { key: 'ArrowUp' });
			await nextTick();
			expect(document.activeElement).toBe(taskItems[0].element);
			await taskItems[0].trigger('keydown', { key: ' ' });
			expect(wrapper.emitted('action')?.[1]).toEqual([localTasks[0]]);
		} finally {
			wrapper.unmount();
		}
	});

	it.each(['Escape', 'Tab', 'a'])('does not prevent the %s key', async (key) => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		await wrapper.get('button').trigger('click');
		const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		wrapper.get('[role="button"]').element.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
	});

	it('only shows visible tasks and puts completed tasks last', async () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		await wrapper.get('button').trigger('click');
		const taskItems = wrapper.findAll('li');

		expect(taskItems).toHaveLength(2);
		expect(taskItems[0].text()).toContain('agents.builder.setupTasks.addInstructions');
		expect(taskItems[1].text()).toContain('agents.builder.setupTasks.chooseModel');
		expect(taskItems[1].attributes('tabindex')).toBeUndefined();
		expect(taskItems[1].attributes('role')).toBeUndefined();
		expect(taskItems[1].attributes('data-selected')).toBe('false');
		expect(wrapper.text()).not.toContain('agents.builder.tools.add');
	});

	it('opens and closes the setup popover', async () => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		const trigger = wrapper.get('button');
		expect(trigger.attributes('type')).toBe('button');
		expect(wrapper.find('[data-testid="agent-setup-tasks"]').exists()).toBe(false);

		await trigger.trigger('click');
		expect(wrapper.find('[data-testid="agent-setup-tasks"]').exists()).toBe(true);
		await trigger.trigger('click');
		expect(wrapper.find('[data-testid="agent-setup-tasks"]').exists()).toBe(false);
	});
});
