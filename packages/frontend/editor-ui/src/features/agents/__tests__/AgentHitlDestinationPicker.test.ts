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
