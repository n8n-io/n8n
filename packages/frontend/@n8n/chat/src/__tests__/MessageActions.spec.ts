import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useChat } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage } from '@n8n/chat/types';

import MessageActions from '../components/MessageActions.vue';

vi.mock('@n8n/design-system', () => ({
	N8nTooltip: {
		name: 'N8nTooltip',
		template: '<div><slot /></div>',
	},
	N8nIcon: {
		name: 'N8nIcon',
		template: '<div :icon="icon" :size="size" @click="$emit(\'click\')"></div>',
		props: ['icon', 'size'],
	},
}));

vi.mock('@n8n/chat/composables', () => ({
	useChat: vi.fn(() => ({
		sendMessage: vi.fn(),
	})),
	useOptions: () => ({
		options: {
			enableMessageActions: true,
		},
	}),
	useI18n: () => ({
		t: vi.fn(),
	}),
}));

vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
	},
}));

describe('MessageActions', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let wrapper: VueWrapper<any>;

	const userMessage: ChatMessage = {
		id: '1',
		text: 'Hello, world!',
		sender: 'user',
		type: 'text',
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
	});

	it('should render message actions for user messages when enabled', () => {
		wrapper = mount(MessageActions, {
			props: {
				message: userMessage,
			},
		});

		expect(wrapper.find('.message-actions').exists()).toBe(true);
	});

	it('should call sendMessage when repost icon is clicked', async () => {
		const mockSendMessage = vi.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		vi.mocked(useChat).mockReturnValue({ sendMessage: mockSendMessage } as any);

		wrapper = mount(MessageActions, {
			props: {
				message: userMessage,
			},
		});

		const repostIcon = wrapper.find('[icon="redo-2"]');
		expect(repostIcon.exists()).toBe(true);

		await repostIcon.trigger('click');

		expect(mockSendMessage).toHaveBeenCalledWith('Hello, world!', []);
	});

	it('should emit setInputValue event when copy to input icon is clicked', async () => {
		wrapper = mount(MessageActions, {
			props: {
				message: userMessage,
			},
		});

		const copyIcon = wrapper.find('[icon="files"]');
		expect(copyIcon.exists()).toBe(true);

		await copyIcon.trigger('click');

		expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Hello, world!');
	});

	it('should handle messages with files when reposting', async () => {
		const mockSendMessage = vi.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		vi.mocked(useChat).mockReturnValue({ sendMessage: mockSendMessage } as any);

		const messageWithFiles: ChatMessage = {
			id: '3',
			text: 'Message with files',
			sender: 'user',
			type: 'text',
			files: [new File(['test'], 'test.txt')],
		};

		wrapper = mount(MessageActions, {
			props: {
				message: messageWithFiles,
			},
		});

		const repostIcon = wrapper.find('[icon="redo-2"]');
		await repostIcon.trigger('click');

		expect(mockSendMessage).toHaveBeenCalledWith('Message with files', [expect.any(File)]);
	});

	it('should not repost empty messages', async () => {
		const mockSendMessage = vi.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		vi.mocked(useChat).mockReturnValue({ sendMessage: mockSendMessage } as any);

		const emptyMessage: ChatMessage = {
			id: '4',
			text: '   ',
			sender: 'user',
			type: 'text',
		};

		wrapper = mount(MessageActions, {
			props: {
				message: emptyMessage,
			},
		});

		const repostIcon = wrapper.find('[icon="redo-2"]');
		await repostIcon.trigger('click');

		expect(mockSendMessage).not.toHaveBeenCalled();
	});

	it('should not copy empty messages to input', async () => {
		const emptyMessage: ChatMessage = {
			id: '5',
			text: '   ',
			sender: 'user',
			type: 'text',
		};

		wrapper = mount(MessageActions, {
			props: {
				message: emptyMessage,
			},
		});

		const copyIcon = wrapper.find('[icon="files"]');
		await copyIcon.trigger('click');

		expect(vi.mocked(chatEventBus.emit)).not.toHaveBeenCalled();
	});
});
