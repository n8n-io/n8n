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
	it('changes selection with the arrow keys without moving focus and activates the selected task', async () => {
		const localTasks: Array<SetupTask<SetupTaskId>> = [{ ...tasks[0], state: 'todo' }, tasks[2]];
		const wrapper = mount(AgentSetupTasks, {
			props: { tasks: localTasks },
			global: { stubs: { TransitionGroup: false } },
			attachTo: document.body,
		});
		try {
			await wrapper.get('button').trigger('click');
			await nextTick();

			const list = wrapper.get('ul');
			const taskItems = wrapper.findAll('[role="menuitem"]');
			(list.element as HTMLElement).focus();
			expect(document.activeElement).toBe(list.element);
			for (const taskItem of taskItems) {
				expect(taskItem.attributes('tabindex')).toBeUndefined();
				expect(taskItem.attributes('data-selected')).toBe('false');
			}

			await list.trigger('keydown', { key: 'ArrowDown' });
			expect(taskItems[0].attributes('data-selected')).toBe('true');
			expect(document.activeElement).toBe(list.element);

			await list.trigger('keydown', { key: 'ArrowDown' });
			expect(taskItems[0].attributes('data-selected')).toBe('false');
			expect(taskItems[1].attributes('data-selected')).toBe('true');
			expect(document.activeElement).toBe(list.element);

			await list.trigger('keydown', { key: 'Enter' });
			expect(wrapper.emitted('action')?.[0]).toEqual([localTasks[1]]);

			await list.trigger('keydown', { key: 'ArrowUp' });
			expect(taskItems[0].attributes('data-selected')).toBe('true');
			expect(taskItems[1].attributes('data-selected')).toBe('false');
			expect(document.activeElement).toBe(list.element);
			await list.trigger('keydown', { key: ' ' });
			expect(wrapper.emitted('action')?.[1]).toEqual([localTasks[0]]);
		} finally {
			wrapper.unmount();
		}
	});

	it('exposes the active task through the named menu without selection attributes', async () => {
		const localTasks: Array<SetupTask<SetupTaskId>> = [{ ...tasks[0], state: 'todo' }, tasks[2]];
		const wrapper = mount(AgentSetupTasks, { props: { tasks: localTasks } });
		try {
			await wrapper.get('button').trigger('click');
			const menu = wrapper.get('[role="menu"]');
			const items = wrapper.findAll('[role="menuitem"]');
			expect(menu.attributes('aria-label')).toBe('agents.builder.setupTasks.title');
			expect(menu.attributes('tabindex')).toBe('-1');
			expect(menu.attributes('aria-activedescendant')).toBeUndefined();
			const ids = items.map((item) => item.attributes('id'));
			expect(ids.every((id) => Boolean(id))).toBe(true);
			expect(new Set(ids).size).toBe(items.length);
			for (const item of items) {
				expect(item.attributes('aria-selected')).toBeUndefined();
				expect(item.attributes('aria-current')).toBeUndefined();
			}

			await menu.trigger('keydown', { key: 'ArrowDown' });
			expect(menu.attributes('aria-activedescendant')).toBe(ids[0]);
			await menu.trigger('keydown', { key: 'ArrowDown' });
			expect(menu.attributes('aria-activedescendant')).toBe(ids[1]);
			await menu.trigger('keydown', { key: 'ArrowUp' });
			expect(menu.attributes('aria-activedescendant')).toBe(ids[0]);
			await items[1].trigger('mouseenter');
			expect(menu.attributes('aria-activedescendant')).toBe(ids[1]);

			await wrapper.setProps({ tasks: [{ ...localTasks[0], state: 'complete' }] });
			expect(menu.attributes('aria-activedescendant')).toBeUndefined();
		} finally {
			wrapper.unmount();
		}
	});

	it.each(['Escape', 'Tab', 'a'])('does not prevent the %s key', async (key) => {
		const wrapper = mount(AgentSetupTasks, { props: { tasks } });
		await wrapper.get('button').trigger('click');
		const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		wrapper.get('[role="menuitem"]').element.dispatchEvent(event);
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
