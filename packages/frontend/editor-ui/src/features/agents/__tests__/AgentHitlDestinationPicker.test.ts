import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { AgentHitlOptionsPage } from '@n8n/api-types';
import AgentHitlDestinationPicker from '../components/AgentHitlDestinationPicker.vue';

vi.unmock('reka-ui');

enableAutoUnmount(afterEach);

function render(
	load: (query: string, cursor?: string) => Promise<AgentHitlOptionsPage>,
	icon: 'hash' | 'user' | 'server' = 'hash',
) {
	return mount(AgentHitlDestinationPicker, {
		props: { label: 'Destination', load, icon },
		attachTo: document.body,
		global: {
			stubs: {
				N8nRecycleScroller: defineComponent({
					props: ['items'],
					setup(_props, { expose }) {
						expose({ scrollToKey: vi.fn() });
					},
					template: '<div><slot v-for="item in items" :item="item" /></div>',
				}),
			},
		},
	});
}
it('loads another page and lets the user select a result with the keyboard', async () => {
	const load = vi
		.fn()
		.mockResolvedValueOnce({ options: [{ id: 'first', name: 'First' }], nextCursor: 'next' })
		.mockResolvedValueOnce({ options: [{ id: 'second', name: 'Second' }] });
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	expect(load).toHaveBeenCalledWith('', undefined);
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Load more')
		?.trigger('click');
	await flushPromises();
	expect(load).toHaveBeenLastCalledWith('', 'next');
	expect(wrapper.findAll('[role="option"]').map((option) => option.text())).toEqual([
		'First',
		'Second',
	]);
	const search = wrapper.find('input');
	await search.trigger('keydown', { key: 'ArrowDown' });
	await search.trigger('keydown', { key: 'ArrowDown' });
	await search.trigger('keydown', { key: 'Enter' });
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{ id: 'second', name: 'Second' }]);
	expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
});
it('ignores an old response when the search changes', async () => {
	const first = createDeferredPromise<AgentHitlOptionsPage>();
	const load = vi
		.fn()
		.mockReturnValueOnce(first.promise)
		.mockResolvedValue({ options: [{ id: 'new', name: 'New match' }] });
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	await wrapper.find('input').setValue('new');
	await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
	await flushPromises();
	first.resolve({ options: [{ id: 'old', name: 'Old result' }], nextCursor: 'old-page' });
	await flushPromises();
	expect(wrapper.text()).toContain('New match');
	expect(wrapper.text()).not.toContain('Old result');
	expect(wrapper.findAll('button').some((button) => button.text() === 'Load more')).toBe(false);
	wrapper.unmount();
});
it('keeps lookup errors recoverable', async () => {
	const load = vi
		.fn()
		.mockRejectedValueOnce(new Error('Missing scope'))
		.mockResolvedValue({ options: [] });
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	expect(wrapper.text()).toContain('Could not load destinations');
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Retry')
		?.trigger('click');
	await flushPromises();
	expect(load).toHaveBeenCalledTimes(2);
	expect(wrapper.text()).not.toContain('Could not load destinations');
	wrapper.unmount();
});

it.each(['hash', 'user', 'server'] as const)(
	'shows the %s icon in the select and its results',
	async (icon) => {
		const destination = { id: 'review', name: 'Review destination' };
		const wrapper = render(vi.fn().mockResolvedValue({ options: [destination] }), icon);
		const trigger = wrapper.get('[data-testid="agent-hitl-destination-picker"]');
		expect(trigger.find(`[data-icon="${icon}"]`).exists()).toBe(true);
		expect(trigger.attributes('aria-expanded')).toBe('false');
		await trigger.trigger('click');
		await flushPromises();
		expect(trigger.attributes('aria-expanded')).toBe('true');
		const option = wrapper.get('[role="option"]');
		expect(option.find(`[data-icon="${icon}"]`).exists()).toBe(true);
		await option.trigger('click');
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([destination]);
		await wrapper.setProps({ modelValue: destination });
		expect(trigger.text()).toBe(destination.name);
		expect(trigger.attributes('aria-expanded')).toBe('false');
	},
);

it('shows loading instead of Load more and skips empty pages before showing a match', async () => {
	const next = createDeferredPromise<AgentHitlOptionsPage>();
	const load = vi
		.fn()
		.mockResolvedValueOnce({ options: [], nextCursor: 'next' })
		.mockReturnValueOnce(next.promise);
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	expect(load).toHaveBeenLastCalledWith('', 'next');
	expect(wrapper.get('[role="status"]').text()).toBe('Loading...');
	expect(wrapper.text()).not.toContain('Load more');
	expect(wrapper.text()).not.toContain('No destinations found');
	next.resolve({ options: [{ id: 'match', name: 'Matching channel' }], nextCursor: 'more' });
	await flushPromises();
	expect(wrapper.get('[role="option"]').text()).toBe('Matching channel');
	expect(wrapper.text()).toContain('Load more');
	expect(wrapper.find('[role="status"]').exists()).toBe(false);
});

it('shows an empty state without Load more after all pages have no matches', async () => {
	const load = vi
		.fn()
		.mockResolvedValueOnce({ options: [], nextCursor: 'next' })
		.mockResolvedValueOnce({ options: [] });
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	expect(load).toHaveBeenCalledTimes(2);
	expect(wrapper.text()).toContain('No destinations found');
	expect(wrapper.text()).not.toContain('Load more');
	expect(wrapper.find('[role="option"]').exists()).toBe(false);
});

it('stops an empty lookup when a provider repeats its cursor', async () => {
	const load = vi.fn().mockResolvedValue({ options: [], nextCursor: 'same' });
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	expect(load).toHaveBeenCalledTimes(2);
	expect(wrapper.text()).toContain('No destinations found');
	expect(wrapper.text()).not.toContain('Load more');
});

it('stops checking empty pages when the picker closes', async () => {
	const first = createDeferredPromise<AgentHitlOptionsPage>();
	const load = vi.fn().mockReturnValue(first.promise);
	const wrapper = render(load);
	const trigger = wrapper.get('[data-testid="agent-hitl-destination-picker"]');
	await trigger.trigger('click');
	await flushPromises();
	await trigger.trigger('click');
	first.resolve({ options: [], nextCursor: 'next' });
	await flushPromises();
	expect(load).toHaveBeenCalledTimes(1);
	expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
});

it('keeps loaded results and retries the same page when loading more fails', async () => {
	const load = vi
		.fn()
		.mockResolvedValueOnce({ options: [{ id: 'first', name: 'First' }], nextCursor: 'next' })
		.mockRejectedValueOnce(new Error('Temporary lookup failure'))
		.mockResolvedValueOnce({ options: [{ id: 'second', name: 'Second' }] });
	const wrapper = render(load);
	await wrapper.get('[data-testid="agent-hitl-destination-picker"]').trigger('click');
	await flushPromises();
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Load more')
		?.trigger('click');
	await flushPromises();
	expect(wrapper.get('[role="option"]').text()).toBe('First');
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Retry')
		?.trigger('click');
	await flushPromises();
	expect(load).toHaveBeenLastCalledWith('', 'next');
	expect(wrapper.findAll('[role="option"]').map((option) => option.text())).toEqual([
		'First',
		'Second',
	]);
	expect(wrapper.text()).not.toContain('Load more');
});
