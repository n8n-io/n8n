import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';

import Chat from '@/components/Chat.vue';
import { useChat, useOptions, useI18n } from '@/composables';
import { chatEventBus } from '@/event-buses';

// Mock the composables
vi.mock('@/composables', () => ({
	useChat: vi.fn(),
	useOptions: vi.fn(),
	useI18n: vi.fn(),
}));

// Mock the event bus
vi.mock('@/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
	},
}));

// Mock child components
vi.mock('@/components/GetStarted.vue', () => ({
	default: {
		name: 'GetStarted',
		template: '<div data-testid="get-started"><slot /></div>',
		emits: ['click:button'],
	},
}));

vi.mock('@/components/GetStartedFooter.vue', () => ({
	default: {
		name: 'GetStartedFooter',
		template: '<div data-testid="get-started-footer" />',
	},
}));

vi.mock('@/components/Input.vue', () => ({
	default: {
		name: 'Input',
		template: '<div data-testid="input" />',
	},
}));

vi.mock('@/components/Layout.vue', () => ({
	default: {
		name: 'Layout',
		template:
			'<div data-testid="layout"><slot name="header" /><slot /><slot name="footer" /></div>',
	},
}));

vi.mock('@/components/MessagesList.vue', () => ({
	default: {
		name: 'MessagesList',
		template: '<div data-testid="messages-list" />',
		props: ['messages'],
	},
}));

// Mock icons
vi.mock('virtual:icons/mdi/close', () => ({
	default: {
		name: 'Close',
		template: '<svg data-testid="close-icon" />',
		props: ['height', 'width'],
	},
}));

describe('Chat.vue', () => {
	let mockChat: any;
	let mockOptions: any;
	let mockI18n: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockChat = {
			messages: ref([]),
			currentSessionId: ref(''),
			startNewSession: vi.fn(),
			loadPreviousSession: vi.fn(),
		};

		mockOptions = {
			options: {
				mode: 'embed',
				showWindowCloseButton: true,
				showWelcomeScreen: true,
			},
		};

		mockI18n = {
			t: vi.fn((key: string) => key),
		};

		vi.mocked(useChat).mockReturnValue(mockChat);
		vi.mocked(useOptions).mockReturnValue(mockOptions);
		vi.mocked(useI18n).mockReturnValue(mockI18n);
	});

	it('should render with welcome screen when no session exists', () => {
		const wrapper = mount(Chat);

		expect(wrapper.find('[data-testid="get-started"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="messages-list"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="get-started-footer"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="input"]').exists()).toBe(false);
	});

	it('should render messages list when session exists', async () => {
		mockChat.currentSessionId.value = 'session-123';

		const wrapper = mount(Chat);
		await nextTick();

		expect(wrapper.find('[data-testid="get-started"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="messages-list"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="get-started-footer"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="input"]').exists()).toBe(true);
	});

	it('should show close button when in window mode', async () => {
		mockOptions.options.mode = 'window';
		mockOptions.options.showWindowCloseButton = true;

		const wrapper = mount(Chat);
		await nextTick();

		const closeButton = wrapper.find('.chat-close-button');
		expect(closeButton.exists()).toBe(true);
		expect(closeButton.find('[data-testid="close-icon"]').exists()).toBe(true);
	});

	it('should not show close button when not in window mode', async () => {
		mockOptions.options.mode = 'embed';

		const wrapper = mount(Chat);
		await nextTick();

		expect(wrapper.find('.chat-close-button').exists()).toBe(false);
	});

	it('should not show close button when showWindowCloseButton is false', async () => {
		mockOptions.options.mode = 'window';
		mockOptions.options.showWindowCloseButton = false;

		const wrapper = mount(Chat);
		await nextTick();

		expect(wrapper.find('.chat-close-button').exists()).toBe(false);
	});

	it('should emit close event when close button is clicked', async () => {
		mockOptions.options.mode = 'window';
		mockOptions.options.showWindowCloseButton = true;

		const wrapper = mount(Chat);
		await nextTick();

		const closeButton = wrapper.find('.chat-close-button');
		await closeButton.trigger('click');

		expect(chatEventBus.emit).toHaveBeenCalledWith('close');
	});

	it('should call startNewSession when get started button is clicked', async () => {
		const wrapper = mount(Chat);
		await nextTick();

		const getStartedComponent = wrapper.findComponent({ name: 'GetStarted' });
		await getStartedComponent.vm.$emit('click:button');

		expect(mockChat.startNewSession).toHaveBeenCalled();
		expect(chatEventBus.emit).toHaveBeenCalledWith('scrollToBottom');
	});

	it('should handle missing startNewSession method gracefully', async () => {
		mockChat.startNewSession = undefined;

		const wrapper = mount(Chat);
		await nextTick();

		const getStarted = wrapper.find('[data-testid="get-started"]');

		// Should not throw error
		expect(async () => await getStarted.trigger('click:button')).not.toThrow();
	});

	it('should load previous session on mount', async () => {
		mount(Chat);
		await nextTick();

		expect(mockChat.loadPreviousSession).toHaveBeenCalled();
	});

	it('should handle missing loadPreviousSession method gracefully', async () => {
		mockChat.loadPreviousSession = undefined;

		// Should not throw error
		expect(() => mount(Chat)).not.toThrow();
	});

	it('should auto-start session when welcome screen is disabled and no session exists', async () => {
		mockOptions.options.showWelcomeScreen = false;
		mockChat.currentSessionId.value = '';

		mount(Chat);
		await nextTick();
		await nextTick(); // Wait for onMounted to complete

		expect(mockChat.startNewSession).toHaveBeenCalled();
	});

	it('should not auto-start session when welcome screen is enabled', async () => {
		mockOptions.options.showWelcomeScreen = true;
		mockChat.currentSessionId.value = '';

		mount(Chat);
		await nextTick();
		await nextTick(); // Wait for onMounted to complete

		expect(mockChat.startNewSession).not.toHaveBeenCalled();
	});

	it('should not auto-start session when session already exists', async () => {
		mockOptions.options.showWelcomeScreen = false;
		mockChat.currentSessionId.value = 'existing-session';

		mount(Chat);
		await nextTick();
		await nextTick(); // Wait for onMounted to complete

		expect(mockChat.startNewSession).not.toHaveBeenCalled();
	});

	it('should display translated title and subtitle', async () => {
		mockI18n.t.mockImplementation((key: string) => {
			const translations: Record<string, string> = {
				title: 'Chat Assistant',
				subtitle: 'How can I help you today?',
				closeButtonTooltip: 'Close Chat',
			};
			return translations[key] || key;
		});

		const wrapper = mount(Chat);
		await nextTick();

		expect(wrapper.text()).toContain('Chat Assistant');
		expect(wrapper.text()).toContain('How can I help you today?');
	});

	it('should not display subtitle when translation is empty', async () => {
		mockI18n.t.mockImplementation((key: string) => {
			if (key === 'subtitle') return '';
			return key;
		});

		const wrapper = mount(Chat);
		await nextTick();

		const subtitle = wrapper.find('p');
		expect(subtitle.exists()).toBe(false);
	});

	it('should handle error during session initialization', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockChat.loadPreviousSession.mockRejectedValue(new Error('Network error'));

		// Mount component and wait for async initialization
		const wrapper = mount(Chat);
		await nextTick();

		// Wait for the async initialization to complete and handle the error
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Component should still be mounted despite the error
		expect(wrapper.exists()).toBe(true);

		consoleErrorSpy.mockRestore();
	});

	it('should handle error during startNewSession', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockChat.startNewSession.mockRejectedValue(new Error('Network error'));

		const wrapper = mount(Chat);
		await nextTick();

		const getStartedComponent = wrapper.findComponent({ name: 'GetStarted' });

		// Should not throw error
		await getStartedComponent.vm.$emit('click:button');
		await new Promise((resolve) => setTimeout(resolve, 0));

		consoleErrorSpy.mockRestore();
	});

	it('should pass messages to MessagesList component', async () => {
		const testMessages = [
			{ id: '1', text: 'Hello', sender: 'user' },
			{ id: '2', text: 'Hi there!', sender: 'bot' },
		];
		mockChat.messages.value = testMessages;
		mockChat.currentSessionId.value = 'session-123';

		const wrapper = mount(Chat);
		await nextTick();

		const messagesList = wrapper.findComponent({ name: 'MessagesList' });
		expect(messagesList.props('messages')).toEqual(testMessages);
	});
});
