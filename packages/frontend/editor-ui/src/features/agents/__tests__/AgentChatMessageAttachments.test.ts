/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';
import AgentChatMessageAttachments from '../components/AgentChatMessageAttachments.vue';
import { AGENT_ATTACHMENT_URL_KEY } from '../components/agentChatInjectionKeys';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function renderComponent(
	attachments: ChatMessageAttachment[],
	options: { attachmentUrlBuilder?: (attachmentId: string) => string } = {},
) {
	return mount(AgentChatMessageAttachments, {
		props: { attachments, projectId: 'project-1', agentId: 'agent-1' },
		global: {
			provide: options.attachmentUrlBuilder
				? { [AGENT_ATTACHMENT_URL_KEY as symbol]: options.attachmentUrlBuilder }
				: {},
		},
	});
}

const imageAttachment: ChatMessageAttachment = {
	fileId: 'att-1',
	fileName: 'photo.png',
	mimeType: 'image/png',
	sizeBytes: 1024,
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AgentChatMessageAttachments', () => {
	it('renders a linked thumbnail for a server-backed image', () => {
		const wrapper = renderComponent([imageAttachment]);

		const img = wrapper.find('img');
		expect(img.attributes('src')).toBe(
			'/rest/projects/project-1/agents/v2/agent-1/chat/attachments/att-1',
		);
		expect(wrapper.find('a').attributes('href')).toBe(img.attributes('src'));
	});

	it("uses the panel's injected URL builder when one is provided", () => {
		const wrapper = renderComponent([imageAttachment], {
			attachmentUrlBuilder: (id) => `/rest/n8n-chat/${id}`,
		});

		expect(wrapper.find('img').attributes('src')).toBe('/rest/n8n-chat/att-1');
	});

	it('renders a file chip with a download link for non-image attachments', () => {
		const wrapper = renderComponent([
			{ fileId: 'att-2', fileName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 2048 },
		]);

		const link = wrapper.find('a');
		expect(link.attributes('download')).toBe('report.pdf');
		expect(link.text()).toContain('report.pdf');
	});

	it('disables a server-backed image link when its preview is unavailable', async () => {
		const wrapper = renderComponent([imageAttachment]);

		await wrapper.find('img').trigger('error');

		expect(wrapper.find('img').exists()).toBe(false);
		const attachment = wrapper.find('figure.n8n-attachment');
		expect(attachment.exists()).toBe(true);
		expect(attachment.text()).toContain('photo.png');
		expect(wrapper.find('a').exists()).toBe(false);
	});

	it('keeps a local attachment when its preview URL errors', async () => {
		const createObjectURL = vi.fn(() => 'blob:local-1');
		const revokeObjectURL = vi.fn();
		vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
		const wrapper = renderComponent([
			{
				fileName: 'local.png',
				mimeType: 'image/png',
				sizeBytes: 10,
				file: new File(['x'], 'local.png', { type: 'image/png' }),
			},
		]);

		// A local preview error keeps the attachment in the message.
		await wrapper.find('img').trigger('error');

		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.find('figure.n8n-attachment').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-chat-attachment-unavailable"]').exists()).toBe(false);
		wrapper.unmount();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-1');
	});
});
