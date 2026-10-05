import type { ChatMessageQueueSteerAction, ChatMessageQueueItem } from './chatMessageQueue.types';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import Draggable from 'vuedraggable';
import { describe, expect, it, vi } from 'vitest';
import ChatMessageQueue from './ChatMessageQueue.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (
			key: string,
			options?: { interpolate?: Record<string, string | number>; adjustToNumber?: number },
		) => {
			if (key === 'chat.messageQueue.title') {
				return `${options?.interpolate?.count} ${options?.adjustToNumber === 1 ? 'message' : 'messages'} up next`;
			}
			return key;
		},
	}),
}));

const items: ChatMessageQueueItem[] = [
	{
		id: '1',
		message: 'First message',
	},
	{
		id: '2',
		message: '',
		attachmentNames: ['notes.txt'],
	},
	{
		id: '3',
		message: 'Third message',
	},
];

function mountQueue(
	overrides: Partial<{
		displayedItems: ChatMessageQueueItem[];

		expanded: boolean;
		isReordering: boolean;
		canEdit: boolean;
		steerAction: ChatMessageQueueSteerAction;
		canSteer: boolean;
		canDragQueueItem: (index: number) => boolean;
		isQueueItemBusy: (item: ChatMessageQueueItem) => boolean;
	}> = {},
) {
	return mount(ChatMessageQueue, {
		props: {
			displayedItems: items,

			expanded: false,
			isReordering: false,
			canEdit: true,
			steerAction: {
				label: 'Send now',
				tooltip: 'Send to the active turn',
				icon: 'corner-down-right',
			},
			canSteer: true,
			canDragQueueItem: () => true,
			isQueueItemBusy: () => false,
			canDropQueueItem: () => true,
			...overrides,
		},
	});
}

describe('ChatMessageQueue', () => {
	it('renders the supplied items and attachment names', () => {
		const wrapper = mountQueue({ displayedItems: items.slice(0, 2) });

		expect(wrapper.findAll('[data-testid="chat-queued-message"]')).toHaveLength(2);
		expect(wrapper.get('[data-queue-id="1"] [title]').text()).toBe('First message');
		expect(wrapper.find('[aria-label="notes.txt"]').exists()).toBe(true);
	});

	it('emits an expansion update from the queue toggle', async () => {
		const wrapper = mountQueue();
		const toggle = wrapper.get('button[aria-expanded]');

		expect(toggle.attributes('aria-expanded')).toBe('false');
		expect(toggle.text()).toContain('3 messages up next');
		await toggle.trigger('click');

		expect(wrapper.emitted('update:expanded')).toEqual([[true]]);
	});

	it('uses a static queue icon when only one item is displayed', () => {
		const wrapper = mountQueue({
			displayedItems: [items[0]],
		});

		expect(wrapper.find('button[aria-expanded]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="chat-queue-drag-handle"]').exists()).toBe(false);
	});

	it.each([
		{ key: 'ArrowUp', to: 0 },
		{ key: 'ArrowDown', to: 2 },
	])('requests a keyboard move with $key', async ({ key, to }) => {
		const wrapper = mountQueue({ expanded: true });
		await wrapper
			.get('[data-queue-id="2"] [data-testid="chat-queue-drag-handle"]')
			.trigger('keydown', { key });
		expect(wrapper.emitted('move')).toEqual([[{ from: 1, to }]]);
	});

	it('ignores keyboard moves while saving the queue order', async () => {
		const wrapper = mountQueue({ expanded: true, isReordering: true });
		await wrapper
			.get('[data-testid="chat-queue-drag-handle"]')
			.trigger('keydown', { key: 'ArrowDown' });
		expect(wrapper.emitted('move')).toBeUndefined();
	});

	it('forwards drag lifecycle events', async () => {
		const wrapper = mountQueue();
		const draggable = wrapper.getComponent(Draggable);
		const event = { oldIndex: 0, newIndex: 2 };

		draggable.vm.$emit('start');
		draggable.vm.$emit('end', event);
		await nextTick();

		expect(wrapper.emitted('drag-start')).toEqual([[]]);
		expect(wrapper.emitted('drag-end')).toEqual([[event]]);
	});

	it('emits the selected queue actions', async () => {
		const wrapper = mountQueue({ displayedItems: [items[0]] });

		await wrapper.get('[aria-label="Send now"]').trigger('click');
		await wrapper.get('[aria-label="generic.edit"]').trigger('click');
		await wrapper.get('[aria-label="generic.delete"]').trigger('click');

		expect(wrapper.emitted('steer')).toEqual([['1']]);
		expect(wrapper.emitted('edit')).toEqual([['1']]);
		expect(wrapper.emitted('remove')).toEqual([['1']]);
	});

	it('disables actions and dragging for a busy item', () => {
		const busyItem = { ...items[0], notice: 'Waiting for the next step' };
		const wrapper = mountQueue({
			displayedItems: [busyItem, items[1]],

			canDragQueueItem: (index) => index !== 0,
			isQueueItemBusy: (item) => item.id === busyItem.id,
		});
		const row = wrapper.get('[data-queue-id="1"]');

		expect(row.get('[role="group"]').attributes('aria-label')).toBe('Waiting for the next step');
		expect(row.get('[data-testid="chat-queue-drag-handle"]').attributes('disabled')).toBeDefined();
		expect(row.find('[aria-label="Send now"]').exists()).toBe(false);
		for (const label of ['generic.edit', 'generic.delete']) {
			expect(row.get(`[aria-label="${label}"]`).attributes('disabled')).toBeDefined();
		}
	});

	it('renders without a steer action', () => {
		const wrapper = mountQueue({ displayedItems: [items[0]], steerAction: undefined });

		expect(wrapper.find('[aria-label="Send now"]').exists()).toBe(false);
		expect(wrapper.find('[aria-label="generic.edit"]').exists()).toBe(true);
		expect(wrapper.find('[aria-label="generic.delete"]').exists()).toBe(true);
	});

	it('disables the steer action when it is not available', () => {
		const wrapper = mountQueue({ displayedItems: [items[0]], canSteer: false });

		expect(wrapper.get('[aria-label="Send now"]').attributes('disabled')).toBeDefined();
	});

	it('disables editing independently from other available actions', () => {
		const wrapper = mountQueue({ displayedItems: [items[0]], canEdit: false });

		expect(wrapper.get('[aria-label="generic.edit"]').attributes('disabled')).toBeDefined();
		expect(wrapper.get('[aria-label="generic.delete"]').attributes('disabled')).toBeUndefined();
	});
});
