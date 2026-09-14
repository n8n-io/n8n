import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionEventFilter from '../components/SessionEventFilter.vue';
import type { FilterOption } from '../session-timeline.types';

vi.mock('@n8n/design-system', () => ({
	N8nButton: { template: '<button><slot /></button>' },
	N8nDropdownMenu: {
		props: ['items'],
		emits: ['select'],
		data() {
			return { open: false };
		},
		template: `
			<div>
				<div @click="open = true"><slot name="trigger" /></div>
				<div v-if="open">
					<template v-for="item in items" :key="item.id">
						<div v-if="item.header">{{ item.label }}</div>
						<button
							v-else
							:data-test-id="item.testId"
							:disabled="item.disabled"
							@click="$emit('select', item.id)"
						>
							<slot name="item-leading" :item="item" :ui="{ class: '' }" />
							<slot name="item-label" :item="item" :ui="{ class: '' }">{{ item.label }}</slot>
						</button>
					</template>
				</div>
			</div>
		`,
	},
	N8nTooltip: { template: '<div><slot /></div>' },
}));

const options: FilterOption[] = [
	{
		key: 'user',
		label: 'User',
		presentation: 'swatch',
		color: 'var(--color--blue-400)',
		count: 2,
	},
	{
		key: 'workflow',
		label: 'Workflow',
		presentation: 'swatch',
		color: 'var(--color--primary)',
		count: 1,
	},
];

function mountFilter(selected = new Set<string>(), available = options) {
	return mount(SessionEventFilter, {
		props: { available, selected },
	});
}

async function openMenu(wrapper: ReturnType<typeof mountFilter>) {
	await wrapper.get('[data-test-id="filter-trigger"]').trigger('click');
}

describe('SessionEventFilter', () => {
	it('renders an icon button labeled "Events"', () => {
		const wrapper = mountFilter();

		expect(wrapper.get('[data-test-id="filter-trigger"]').attributes('aria-label')).toBe('Events');
	});

	it('shows an active indicator when items are selected', () => {
		const wrapper = mountFilter(new Set(['user']));

		expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
	});

	it('omits the active indicator when nothing is selected', () => {
		const wrapper = mountFilter();

		expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false);
	});

	it('opens the menu on trigger click, hiding options until opened', async () => {
		const wrapper = mountFilter();
		expect(wrapper.find('[data-test-id="filter-option-user"]').exists()).toBe(false);

		await openMenu(wrapper);

		expect(wrapper.find('[data-test-id="filter-option-user"]').exists()).toBe(true);
	});

	it('groups event and status options and shows their counts', async () => {
		const available: FilterOption[] = [
			...options,
			{
				key: 'approved',
				label: 'Approved',
				presentation: 'badge',
				badgeTheme: 'success',
				count: 3,
			},
		];
		const wrapper = mountFilter(new Set(), available);
		await openMenu(wrapper);

		expect(wrapper.text()).toContain('Events');
		expect(wrapper.text()).toContain('Status');
		expect(wrapper.get('[data-test-id="filter-option-user"]').text()).toContain('User 2');
		expect(wrapper.get('[data-test-id="filter-option-approved"]').text()).toContain('Approved 3');
	});

	it('emits update with the selected key added', async () => {
		const wrapper = mountFilter();
		await openMenu(wrapper);
		await wrapper.get('[data-test-id="filter-option-user"]').trigger('click');

		const events = wrapper.emitted('update') ?? [];
		const last = events.at(-1)?.[0] as Set<string>;
		expect(Array.from(last)).toEqual(['user']);
	});

	it('emits update with the selected key removed', async () => {
		const wrapper = mountFilter(new Set(['user', 'workflow']));
		await openMenu(wrapper);
		await wrapper.get('[data-test-id="filter-option-user"]').trigger('click');

		const events = wrapper.emitted('update') ?? [];
		const last = events.at(-1)?.[0] as Set<string>;
		expect(Array.from(last)).toEqual(['workflow']);
	});

	it('disables Reset when the selection is empty', async () => {
		const wrapper = mountFilter();
		await openMenu(wrapper);

		expect(wrapper.get('[data-test-id="filter-clear"]').attributes()).toHaveProperty('disabled');
	});

	it('enables Reset and emits an empty selection when clicked', async () => {
		const wrapper = mountFilter(new Set(['user']));
		await openMenu(wrapper);
		const reset = wrapper.get('[data-test-id="filter-clear"]');

		expect(reset.attributes()).not.toHaveProperty('disabled');
		await reset.trigger('click');

		const events = wrapper.emitted('update') ?? [];
		const last = events.at(-1)?.[0] as Set<string>;
		expect(last.size).toBe(0);
	});
});
