import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { AgentHitlOptionsPage } from '@n8n/api-types';
import AgentHitlDestinationPicker from '../components/AgentHitlDestinationPicker.vue';

function render(load: (query: string, cursor?: string) => Promise<AgentHitlOptionsPage>) {
	return mount(AgentHitlDestinationPicker, {
		props: { label: 'Destination', load },
		global: {
			stubs: {
				N8nPopover: defineComponent({
					name: 'N8nPopover',
					props: ['open'],
					emits: ['update:open'],
					template: '<div><slot name="trigger" /><div v-if="open"><slot /></div></div>',
				}),
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
	wrapper.findComponent({ name: 'N8nPopover' }).vm.$emit('update:open', true);
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
	wrapper.findComponent({ name: 'N8nPopover' }).vm.$emit('update:open', true);
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
	wrapper.findComponent({ name: 'N8nPopover' }).vm.$emit('update:open', true);
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
