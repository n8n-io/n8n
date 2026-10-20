import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it } from 'vitest';
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

describe('SessionMessageItem', () => {
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
