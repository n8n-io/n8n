/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';
import AgentChatMessageAttachments from '../components/AgentChatMessageAttachments.vue';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function renderComponent(attachments: ChatMessageAttachment[]) {
	return mount(AgentChatMessageAttachments, {
		props: { attachments, projectId: 'project-1', agentId: 'agent-1' },
	});
}

const imageAttachment: ChatMessageAttachment = {
	fileId: 'att-1',
	fileName: 'photo.png',
	mimeType: 'image/png',
	sizeBytes: 1024,
};

describe('AgentChatMessageAttachments', () => {
	it('renders a linked thumbnail for a server-backed image', () => {
		const wrapper = renderComponent([imageAttachment]);

		const img = wrapper.find('img');
		expect(img.attributes('src')).toBe(
			'/rest/projects/project-1/agents/v2/agent-1/chat/attachments/att-1',
		);
		expect(wrapper.find('a').attributes('href')).toBe(img.attributes('src'));
	});

	it('renders a file chip with a download link for non-image attachments', () => {
		const wrapper = renderComponent([
			{ fileId: 'att-2', fileName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 2048 },
		]);

		const link = wrapper.find('a');
		expect(link.attributes('download')).toBe('report.pdf');
		expect(link.text()).toContain('report.pdf');
	});

	it('swaps a thumbnail whose bytes are gone for an unavailable chip', async () => {
		const wrapper = renderComponent([imageAttachment]);

		await wrapper.find('img').trigger('error');

		expect(wrapper.find('img').exists()).toBe(false);
		const chip = wrapper.find('[data-testid="agent-chat-attachment-unavailable"]');
		expect(chip.exists()).toBe(true);
		expect(chip.text()).toContain('photo.png');
		expect(chip.text()).toContain('agents.chat.attachments.unavailable');
	});

	it('keeps local-only image previews even if the object URL errors', async () => {
		const createObjectURL = vi.fn(() => 'blob:local-1');
		vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
		const wrapper = renderComponent([
			{
				fileName: 'local.png',
				mimeType: 'image/png',
				sizeBytes: 10,
				file: new File(['x'], 'local.png', { type: 'image/png' }),
			},
		]);

		// No server href — an error on a local preview is not a pruned attachment.
		await wrapper.find('img').trigger('error');

		expect(wrapper.find('img').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-chat-attachment-unavailable"]').exists()).toBe(false);
		vi.unstubAllGlobals();
	});
});
