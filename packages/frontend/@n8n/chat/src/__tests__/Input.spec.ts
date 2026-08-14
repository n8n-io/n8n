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
		blockUserInput: { value: false },
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

	it('keeps waitingForResponse true after setting up the WebSocket connection', () => {
		// The initial sendMessage clears waitingForResponse on `executionStarted`;
		// the connection setup must re-enable it so the typing indicator stays up
		// until the first bot frame arrives over the socket.
		// The shared vi.fn mock doesn't return its object from `new`, so use a
		// class that returns a captured instance (same pattern as the frame tests).
		const ws = { send: vi.fn(), onmessage: null, onclose: null };
		class FakeWebSocket {
			constructor() {
				return ws;
			}
		}
		// @ts-expect-error - mock WebSocket
		global.WebSocket = FakeWebSocket;
		wrapper = mount(Input);
		wrapper.vm.chatStore.waitingForResponse.value = false;

		wrapper.vm.setupWebsocketConnection('exec-123');

		expect(wrapper.vm.chatStore.waitingForResponse.value).toBe(true);
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

	describe('WebSocket frame handling (backward compatible)', () => {
		// The shared vi.fn WebSocket mock doesn't return its object from `new`, so
		// use a class that returns a captured instance we can drive directly.
		let ws: { send: ReturnType<typeof vi.fn>; onmessage: ((e: { data: string }) => void) | null };
		const emit = (data: string) => ws.onmessage?.({ data });

		beforeEach(() => {
			ws = { send: vi.fn(), onmessage: null };
			class FakeWebSocket {
				constructor() {
					return ws;
				}
			}
			// @ts-expect-error - mock WebSocket
			global.WebSocket = FakeWebSocket;
			wrapper = mount(Input);
			wrapper.vm.setupWebsocketConnection('exec-123');
		});

		it('acks a legacy string heartbeat with the legacy ack', () => {
			emit('n8n|heartbeat');

			expect(ws.send).toHaveBeenCalledWith('n8n|heartbeat-ack');
			expect(wrapper.vm.chatStore.messages.value).toHaveLength(0);
		});

		it('acks a JSON heartbeat frame with a JSON ack', () => {
			emit(JSON.stringify({ type: 'heartbeat' }));

			expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'heartbeat-ack' }));
			expect(wrapper.vm.chatStore.messages.value).toHaveLength(0);
		});

		it('treats a legacy continue frame as control, not a message', () => {
			emit('n8n|heartbeat'); // locks legacy mode
			emit('n8n|continue');

			expect(wrapper.vm.chatStore.messages.value).toHaveLength(0);
			expect(wrapper.vm.chatStore.waitingForResponse.value).toBe(true);
		});

		it('treats a JSON continue frame as control once JSON mode is established', () => {
			emit(JSON.stringify({ type: 'heartbeat' })); // locks JSON mode
			emit(JSON.stringify({ type: 'continue' }));

			expect(wrapper.vm.chatStore.messages.value).toHaveLength(0);
			expect(wrapper.vm.chatStore.waitingForResponse.value).toBe(true);
		});

		it('renders JSON that looks like a control frame as a message when the server is legacy', () => {
			emit('n8n|heartbeat'); // locks legacy mode (single legacy ack)
			emit(JSON.stringify({ type: 'continue' }));
			emit(JSON.stringify({ type: 'heartbeat' }));

			// Both are rendered as text, not swallowed or acked as control frames
			expect(wrapper.vm.chatStore.messages.value).toHaveLength(2);
			expect(wrapper.vm.chatStore.messages.value[0]).toMatchObject({
				sender: 'bot',
				text: JSON.stringify({ type: 'continue' }),
			});
			expect(wrapper.vm.chatStore.messages.value[1]).toMatchObject({
				sender: 'bot',
				text: JSON.stringify({ type: 'heartbeat' }),
			});
			expect(ws.send).toHaveBeenCalledTimes(1);
			expect(ws.send).toHaveBeenCalledWith('n8n|heartbeat-ack');
		});

		it('keeps JSON mode when a stray legacy heartbeat arrives later', () => {
			emit(JSON.stringify({ type: 'heartbeat' })); // locks JSON mode
			emit('n8n|heartbeat'); // stray legacy frame — must NOT flip the mode
			emit(JSON.stringify({ type: 'continue' }));

			// the stray legacy heartbeat renders as a message; JSON control still works
			expect(wrapper.vm.chatStore.messages.value).toHaveLength(1);
			expect(wrapper.vm.chatStore.messages.value[0]).toMatchObject({
				sender: 'bot',
				text: 'n8n|heartbeat',
			});
			expect(wrapper.vm.chatStore.waitingForResponse.value).toBe(true);
			// only the JSON ack from the real heartbeat — no legacy ack for the stray
			expect(ws.send).toHaveBeenCalledTimes(1);
			expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'heartbeat-ack' }));
		});

		it('renders a JSON message frame as bot text', () => {
			emit(JSON.stringify({ type: 'message', text: 'Hello' }));

			expect(wrapper.vm.chatStore.messages.value).toHaveLength(1);
			expect(wrapper.vm.chatStore.messages.value[0]).toMatchObject({
				sender: 'bot',
				text: 'Hello',
			});
		});

		it('renders a legacy raw-string message as bot text', () => {
			emit('Just some text');

			expect(wrapper.vm.chatStore.messages.value).toHaveLength(1);
			expect(wrapper.vm.chatStore.messages.value[0]).toMatchObject({
				sender: 'bot',
				text: 'Just some text',
			});
		});
	});
});
