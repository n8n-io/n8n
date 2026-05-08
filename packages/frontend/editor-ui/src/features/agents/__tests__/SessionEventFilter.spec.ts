/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionEventFilter from '../components/SessionEventFilter.vue';
import type { FilterOption } from '../session-timeline.types';

vi.mock('@n8n/design-system', () => ({
	N8nButton: { template: '<button><slot /></button>' },
	N8nPopover: {
		props: ['open'],
		emits: ['update:open'],
		template:
			'<div><div @click="$emit(\'update:open\', true)"><slot name="trigger" /></div><div v-if="open"><slot name="content" /></div></div>',
	},
	N8nIcon: { template: '<span />' },
}));

const options: FilterOption[] = [
	{ key: 'user', label: 'User', color: 'var(--color--blue-400)', count: 2 },
	{ key: 'workflow', label: 'Workflow', color: 'var(--color--primary)', count: 1 },
];

describe('SessionEventFilter', () => {
	it('renders a button labeled "Events"', () => {
		const w = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>() },
		});
		expect(w.find('[data-test-id="filter-trigger"]').text()).toContain('Events');
	});

	it('shows a count badge when items are selected', () => {
		const w = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>(['user']) },
		});
		expect(w.find('[data-test-id="filter-trigger"]').text()).toContain('(1)');
	});

	it('omits the count badge when nothing is selected', () => {
		const w = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>() },
		});
		expect(w.find('[data-test-id="filter-trigger"]').text()).not.toMatch(/\(\d+\)/);
	});

	it('opens the popover on trigger click, hiding options until opened', async () => {
		const w = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>() },
		});
		expect(w.find('[data-test-id="filter-option-user"]').exists()).toBe(false);
		await w.find('[data-test-id="filter-trigger"]').trigger('click');
		expect(w.find('[data-test-id="filter-option-user"]').exists()).toBe(true);
	});

	it('emits update with the toggled key added to the selection', async () => {
		const w = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>() },
		});
		await w.find('[data-test-id="filter-trigger"]').trigger('click');
		const checkbox = w.find('[data-test-id="filter-option-user"] input[type=checkbox]');
		await checkbox.setValue(true);
		const events = w.emitted('update') ?? [];
		const last = events[events.length - 1]?.[0] as Set<string>;
		expect(Array.from(last)).toEqual(['user']);
	});

	it('emits update with the toggled key removed when unchecked', async () => {
		const w = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>(['user', 'workflow']) },
		});
		await w.find('[data-test-id="filter-trigger"]').trigger('click');
		const checkbox = w.find('[data-test-id="filter-option-user"] input[type=checkbox]');
		await checkbox.setValue(false);
		const events = w.emitted('update') ?? [];
		const last = events[events.length - 1]?.[0] as Set<string>;
		expect(Array.from(last)).toEqual(['workflow']);
	});

	it('shows Clear only when selection is non-empty, and emits empty set when clicked', async () => {
		const w1 = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>() },
		});
		await w1.find('[data-test-id="filter-trigger"]').trigger('click');
		expect(w1.find('[data-test-id="filter-clear"]').exists()).toBe(false);

		const w2 = mount(SessionEventFilter, {
			props: { available: options, selected: new Set<string>(['user']) },
		});
		await w2.find('[data-test-id="filter-trigger"]').trigger('click');
		await w2.find('[data-test-id="filter-clear"]').trigger('click');
		const events = w2.emitted('update') ?? [];
		const last = events[events.length - 1]?.[0] as Set<string>;
		expect(last.size).toBe(0);
	});
});
