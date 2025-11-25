import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { chatEventBus } from '@n8n/chat/event-buses';

import Chat from '../components/Chat.vue';
import type { ChatMessage } from '../types/messages';

// Mock child components
vi.mock('../components/GetStarted.vue', () => ({
	default: { name: 'GetStarted', template: '<div>GetStarted</div>' },
}));

vi.mock('../components/GetStartedFooter.vue', () => ({
	default: { name: 'GetStartedFooter', template: '<div>GetStartedFooter</div>' },
}));

vi.mock('../components/Input.vue', () => ({
	default: {
		name: 'Input',
		template:
			'<div data-test-id="chat-input" @arrow-key-down="$emit(\'arrowKeyDown\', $event)" @escape-key-down="$emit(\'escapeKeyDown\', $event)"></div>',
	},
}));

vi.mock('../components/Layout.vue', () => ({
	default: {
		name: 'Layout',
		template: '<div><slot /><slot name="footer" /></div>',
	},
}));

vi.mock('../components/MessagesList.vue', () => ({
	default: {
		name: 'MessagesList',
		template: '<div>MessagesList</div>',
		props: ['messages'],
	},
}));

vi.mock('virtual:icons/mdi/close', () => ({
	default: { name: 'IconClose' },
}));

const mockChatStore = {
	initialize: vi.fn().mockResolvedValue(undefined),
	startNewSession: vi.fn(),
	messages: [] as ChatMessage[],
};

const mockOptions = {
	mode: 'window' as const,
	showWindowCloseButton: true,
	showWelcomeScreen: false,
};

vi.mock('@n8n/chat/composables', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
	useChat: () => ({
		messages: { value: mockChatStore.messages },
		initialize: mockChatStore.initialize,
		startNewSession: mockChatStore.startNewSession,
		currentSessionId: { value: 'test-session' },
	}),
	useOptions: () => ({ options: mockOptions }),
}));

vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
		on: vi.fn(),
	},
}));

describe('Chat', () => {
	let wrapper: VueWrapper;

	beforeEach(() => {
		vi.clearAllMocks();
		mockChatStore.messages = [];
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
	});

	describe('arrow key navigation', () => {
		beforeEach(() => {
			// Set up messages for testing navigation
			mockChatStore.messages = [
				{
					id: '1',
					text: 'First message',
					sender: 'user',
					type: 'text',
				},
				{
					id: '2',
					text: 'Bot response',
					sender: 'bot',
					type: 'text',
				},
				{
					id: '3',
					text: 'Second message',
					sender: 'user',
					type: 'text',
				},
				{
					id: '4',
					text: 'Third message',
					sender: 'user',
					type: 'text',
				},
			];
		});

		it('should navigate to previous message on ArrowUp', async () => {
			wrapper = mount(Chat);

			// Trigger ArrowUp
			const input = wrapper.findComponent({ name: 'Input' });
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });

			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Third message');
		});

		it('should navigate through message history on multiple ArrowUp presses', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// First ArrowUp - should get most recent message
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Third message');

			// Second ArrowUp - should get second most recent
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Third message' });
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Second message');

			// Third ArrowUp - should get oldest
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Second message' });
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'First message');
		});

		it('should not go beyond the oldest message', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// Navigate to the end
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Third message' });
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Second message' });

			vi.clearAllMocks();

			// Try to go beyond the oldest message
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'First message' });

			// Should still emit blur/focus, but not setInputValue
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('blurInput');
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('focusInput');
			expect(vi.mocked(chatEventBus.emit)).not.toHaveBeenCalledWith(
				'setInputValue',
				expect.anything(),
			);
		});

		it('should navigate forward on ArrowDown', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// Navigate back first
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Third message' });

			vi.clearAllMocks();

			// Navigate forward
			await input.vm.$emit('arrowKeyDown', {
				key: 'ArrowDown',
				currentInputValue: 'Second message',
			});
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Third message');
		});

		it('should clear input when navigating past the newest message', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// Navigate back
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });

			vi.clearAllMocks();

			// Navigate forward to clear
			await input.vm.$emit('arrowKeyDown', {
				key: 'ArrowDown',
				currentInputValue: 'Third message',
			});
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', '');
		});

		it('should handle empty message history gracefully', async () => {
			mockChatStore.messages = [];
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });

			expect(vi.mocked(chatEventBus.emit)).not.toHaveBeenCalled();
		});

		it('should only include user messages in navigation', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// First ArrowUp should skip bot messages
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Third message');

			// Second ArrowUp should also skip bot messages
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Third message' });
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Second message');
		});

		it('should reset history index when messageSent event is emitted', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// Navigate back in history
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: 'Third message' });

			// Get the messageSent callback
			const messageSentCallback = vi
				.mocked(chatEventBus.on)
				.mock.calls.find((call) => call[0] === 'messageSent')?.[1];

			expect(messageSentCallback).toBeDefined();

			// Trigger messageSent event
			if (messageSentCallback) {
				messageSentCallback();
			}

			vi.clearAllMocks();

			// After reset, ArrowUp should start from the beginning again
			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('setInputValue', 'Third message');
		});

		it('should preserve current input when starting navigation', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			// Start navigation with some input
			await input.vm.$emit('arrowKeyDown', {
				key: 'ArrowUp',
				currentInputValue: 'My partial message',
			});

			// Navigate down to restore
			await input.vm.$emit('arrowKeyDown', {
				key: 'ArrowDown',
				currentInputValue: 'Third message',
			});
			await input.vm.$emit('arrowKeyDown', {
				key: 'ArrowDown',
				currentInputValue: 'Third message',
			});

			// Should restore the original input
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith(
				'setInputValue',
				'My partial message',
			);
		});

		it('should emit blur and focus events during navigation', async () => {
			wrapper = mount(Chat);
			const input = wrapper.findComponent({ name: 'Input' });

			vi.clearAllMocks();

			await input.vm.$emit('arrowKeyDown', { key: 'ArrowUp', currentInputValue: '' });

			// Should blur before setting value
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('blurInput');
			// Should focus after setting value
			expect(vi.mocked(chatEventBus.emit)).toHaveBeenCalledWith('focusInput');
		});
	});
});
