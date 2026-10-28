import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionMessageItem from './SessionMessageItem.vue';
import type { TimelineItem } from '../../session-timeline.types';

const attachment = {
	id: 'file-1',
	fileName: 'notes.pdf',
	mimeType: 'application/pdf',
	sizeBytes: 42,
};
const userItem: TimelineItem = {
	kind: 'user',
	executionId: 'e1',
	timestamp: 0,
	attachments: [attachment],
};

function mountMessage(
	item: TimelineItem,
	scope: { projectId?: string; agentId?: string } = { projectId: 'p1', agentId: 'a1' },
) {
	return mount(SessionMessageItem, {
		props: { item, senderName: 'User', messageMarkdown: item.content ?? '', ...scope },
		global: { plugins: [createTestingPinia()] },
	});
}

enableAutoUnmount(afterEach);

afterEach(() => {
	vi.restoreAllMocks();
});

async function mountExpandedMessage() {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
		new DOMRect(0, 0, 100, 400),
	);
	const wrapper = mountMessage(userItem);
	await wrapper.setProps({ messageMarkdown: 'A long message' });
	const button = wrapper.get('button[aria-expanded]');
	expect(button.attributes('aria-expanded')).toBe('false');
	await button.trigger('click');
	expect(button.attributes('aria-expanded')).toBe('true');
	return wrapper;
}

describe('SessionMessageItem', () => {
	it('keeps a message expanded when its object and content refresh', async () => {
		const wrapper = await mountExpandedMessage();
		await wrapper.setProps({
			item: { ...userItem, content: 'Updated content' },
			messageMarkdown: 'Updated content',
		});

		expect(wrapper.get('button[aria-expanded]').attributes('aria-expanded')).toBe('true');
	});

	it.each([{ kind: 'agent' as const }, { executionId: 'e2' }, { timestamp: 1000 }])(
		'collapses a different message with identity %j',
		async (identity) => {
			const wrapper = await mountExpandedMessage();
			await wrapper.setProps({ item: { ...userItem, ...identity } });

			expect(wrapper.get('button[aria-expanded]').attributes('aria-expanded')).toBe('false');
		},
	);

	it('lets the user collapse an expanded message', async () => {
		const wrapper = await mountExpandedMessage();
		await wrapper.get('button[aria-expanded]').trigger('click');

		expect(wrapper.get('button[aria-expanded]').attributes('aria-expanded')).toBe('false');
	});

	it.each(['', 'Read this file.'])(
		'renders attachments for a user message with text %j',
		(content) => {
			const wrapper = mountMessage({ ...userItem, content });
			const link = wrapper.get('a[download="notes.pdf"]');
			expect(link.text()).toContain('notes.pdf');
			expect(link.attributes('href')).toContain('/attachments/file-1');
			expect(link.attributes('href')).toContain('p1');
			expect(link.attributes('href')).toContain('a1');
			wrapper.unmount();
		},
	);

	it('updates attachments when the item changes', async () => {
		const wrapper = mountMessage(userItem);
		await wrapper.setProps({ item: { ...userItem, attachments: [] } });
		expect(wrapper.find('[data-testid="agent-chat-message-attachments"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('does not render user attachments on agent messages', () => {
		const wrapper = mountMessage({ ...userItem, kind: 'agent' });
		expect(wrapper.find('[data-testid="agent-chat-message-attachments"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('does not render attachments without download scope', () => {
		const wrapper = mountMessage(userItem, {});
		expect(wrapper.find('[data-testid="agent-chat-message-attachments"]').exists()).toBe(false);
		wrapper.unmount();
	});
});
