import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import Input from '../components/Input.vue';

vi.mock('@vueuse/core', () => ({
	useFileDialog: vi.fn(() => ({
		open: vi.fn(),
		reset: vi.fn(),
		onChange: vi.fn(),
	})),
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'mock-uuid-123'),
}));

vi.mock('virtual:icons/mdi/paperclip', () => ({
	default: { name: 'IconPaperclip' },
}));

vi.mock('virtual:icons/mdi/send', () => ({
	default: { name: 'IconSend' },
}));

vi.mock('@n8n/chat/composables', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
	useChat: () => ({
		waitingForResponse: { value: false },
		currentSessionId: { value: 'session-123' },
		messages: { value: [] },
		sendMessage: vi.fn(),
		ws: null,
	}),
	useOptions: () => ({
		options: {
			disabled: { value: false },
			allowFileUploads: { value: true },
			allowedFilesMimeTypes: { value: 'image/*,text/*' },
			webhookUrl: 'https://example.com/webhook',
		},
	}),
}));

vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		on: vi.fn(),
		off: vi.fn(),
	},
}));

vi.mock('./ChatFile.vue', () => ({
	default: { name: 'ChatFile' },
}));

describe('ChatInput', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let wrapper: VueWrapper<any>;

	beforeEach(() => {
		// @ts-expect-error - mock WebSocket
		global.WebSocket = vi.fn().mockImplementation(
			() =>
				({
					send: vi.fn(),
					close: vi.fn(),
					onmessage: null,
					onclose: null,
				}) as unknown as WebSocket,
		);
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
		vi.clearAllMocks();
	});

	it('renders the component with default props', () => {
		wrapper = mount(Input);

		expect(wrapper.find('textarea').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="chat-input"]').exists()).toBe(true);
		expect(wrapper.find('.chat-input-send-button').exists()).toBe(true);
	});

	it('applies custom placeholder', () => {
		wrapper = mount(Input, {
			props: {
				placeholder: 'customPlaceholder',
			},
		});

		const textarea = wrapper.find('textarea');
		expect(textarea.attributes('placeholder')).toBe('customPlaceholder');
	});

	it('updates input value when typing', async () => {
		const textarea = wrapper.find('textarea');

		await textarea.setValue('Hello world');

		expect(wrapper.vm.input).toBe('Hello world');
	});

	it('does not submit on Shift+Enter', async () => {
		const textarea = wrapper.find('textarea');
		const onSubmitSpy = vi.spyOn(wrapper.vm, 'onSubmit');

		await textarea.setValue('Test message');
		await textarea.trigger('keydown.enter', { shiftKey: true });

		expect(onSubmitSpy).not.toHaveBeenCalled();
	});

	it('sets up WebSocket connection with execution ID', () => {
		const executionId = 'exec-123';

		wrapper.vm.setupWebsocketConnection(executionId);

		expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('sessionId=session-123'));
		expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('executionId=exec-123'));
	});

	it('handles WebSocket messages correctly', async () => {
		const mockWs = {
			send: vi.fn(),
			onmessage: null,
			onclose: null,
		};
		wrapper.vm.chatStore.ws = mockWs;
		wrapper.vm.waitingForChatResponse = true;

		await wrapper.vm.respondToChatNode(mockWs, 'Test message');

		expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"chatInput":"Test message"'));
	});

	it('handles empty file list gracefully', () => {
		wrapper.vm.files = null;

		expect(() => wrapper.vm.attachFiles()).not.toThrow();
		expect(wrapper.vm.attachFiles()).toEqual([]);
	});

	it('prevents submit when disabled', async () => {
		const submitButton = wrapper.find('.chat-input-send-button');

		await submitButton.trigger('click');

		expect(wrapper.vm.isSubmitting).toBe(false);
	});
});
