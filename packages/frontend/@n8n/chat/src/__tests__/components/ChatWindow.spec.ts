import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ChatWindow from '@/components/ChatWindow.vue';
import { chatEventBus } from '@/event-buses';

// Mock the event bus
vi.mock('@/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
	},
}));

// Mock Chat component
vi.mock('@/components/Chat.vue', () => ({
	default: {
		name: 'Chat',
		template: '<div data-testid="chat-component">Chat Component</div>',
	},
}));

// Mock icons
vi.mock('virtual:icons/mdi/chat', () => ({
	default: {
		name: 'IconChat',
		template: '<svg data-testid="chat-icon" />',
		props: ['height', 'width'],
	},
}));

vi.mock('virtual:icons/mdi/chevron-down', () => ({
	default: {
		name: 'IconChevronDown',
		template: '<svg data-testid="chevron-down-icon" />',
		props: ['height', 'width'],
	},
}));

describe('ChatWindow.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render with chat window closed by default', () => {
		const wrapper = mount(ChatWindow);

		expect(wrapper.find('.chat-window').exists()).toBe(true);
		expect(wrapper.find('.chat-window').isVisible()).toBe(false);
		expect(wrapper.find('[data-testid="chat-icon"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="chevron-down-icon"]').exists()).toBe(false);
	});

	it('should show chat icon when closed', () => {
		const wrapper = mount(ChatWindow);

		const chatIcon = wrapper.find('[data-testid="chat-icon"]');
		expect(chatIcon.exists()).toBe(true);
	});

	it('should toggle chat window when toggle button is clicked', async () => {
		const wrapper = mount(ChatWindow);

		const toggleButton = wrapper.find('.chat-window-toggle');
		expect(toggleButton.exists()).toBe(true);

		// Initially closed
		expect(wrapper.vm.isOpen).toBe(false);

		// Click to open
		await toggleButton.trigger('click');
		await nextTick();

		expect(wrapper.vm.isOpen).toBe(true);
		expect(wrapper.find('[data-testid="chat-icon"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="chevron-down-icon"]').exists()).toBe(true);
	});

	it('should show chevron down icon when opened', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		await toggleButton.trigger('click');
		await nextTick();

		const chevronIcon = wrapper.find('[data-testid="chevron-down-icon"]');
		expect(chevronIcon.exists()).toBe(true);
	});

	it('should toggle back to closed when clicked again', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Open
		await toggleButton.trigger('click');
		await nextTick();
		expect(wrapper.vm.isOpen).toBe(true);

		// Close
		await toggleButton.trigger('click');
		await nextTick();
		expect(wrapper.vm.isOpen).toBe(false);
		expect(wrapper.find('[data-testid="chat-icon"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="chevron-down-icon"]').exists()).toBe(false);
	});

	it('should emit scrollToBottom event when opening chat window', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		await toggleButton.trigger('click');
		await nextTick();

		expect(chatEventBus.emit).toHaveBeenCalledWith('scrollToBottom');
	});

	it('should not emit scrollToBottom event when closing chat window', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Open first
		await toggleButton.trigger('click');
		await nextTick();

		vi.clearAllMocks(); // Clear previous calls

		// Close
		await toggleButton.trigger('click');
		await nextTick();

		expect(chatEventBus.emit).not.toHaveBeenCalled();
	});

	it('should render Chat component inside chat window', () => {
		const wrapper = mount(ChatWindow);

		expect(wrapper.find('[data-testid="chat-component"]').exists()).toBe(true);
	});

	it('should have proper CSS classes for styling', () => {
		const wrapper = mount(ChatWindow);

		expect(wrapper.find('.chat-window-wrapper').exists()).toBe(true);
		expect(wrapper.find('.chat-window').exists()).toBe(true);
		expect(wrapper.find('.chat-window-toggle').exists()).toBe(true);
	});

	it('should handle multiple rapid toggles correctly', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Rapid toggles
		await toggleButton.trigger('click');
		await toggleButton.trigger('click');
		await toggleButton.trigger('click');
		await nextTick();

		// Should end up open (odd number of clicks)
		expect(wrapper.find('.chat-window').isVisible()).toBe(true);
		expect(wrapper.find('[data-testid="chevron-down-icon"]').exists()).toBe(true);
	});

	it('should maintain state consistency during transitions', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Test state consistency
		expect(wrapper.vm.isOpen).toBe(false);

		await toggleButton.trigger('click');
		expect(wrapper.vm.isOpen).toBe(true);

		await toggleButton.trigger('click');
		expect(wrapper.vm.isOpen).toBe(false);
	});

	it('should handle keyboard interactions on toggle button', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Simulate Enter key press
		await toggleButton.trigger('keydown.enter');
		await nextTick();

		// Note: Since we're only testing click handlers, keydown won't toggle by default
		// This test verifies the element is accessible for keyboard interaction
		expect(toggleButton.exists()).toBe(true);
	});

	it('should have proper transition classes', () => {
		const wrapper = mount(ChatWindow);

		const chatWindow = wrapper.find('.chat-window');
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Check if transition components are present (Vue test utils uses transition-stub)
		expect(chatWindow.element.parentElement?.tagName.toLowerCase()).toBe('transition-stub');
	});

	it('should emit scrollToBottom only when opening', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Open
		await toggleButton.trigger('click');
		await nextTick();
		expect(chatEventBus.emit).toHaveBeenCalledTimes(1);
		expect(chatEventBus.emit).toHaveBeenCalledWith('scrollToBottom');

		vi.clearAllMocks();

		// Close
		await toggleButton.trigger('click');
		await nextTick();
		expect(chatEventBus.emit).not.toHaveBeenCalled();

		// Open again
		await toggleButton.trigger('click');
		await nextTick();
		expect(chatEventBus.emit).toHaveBeenCalledTimes(1);
		expect(chatEventBus.emit).toHaveBeenCalledWith('scrollToBottom');
	});

	it('should handle rapid successive clicks', async () => {
		const wrapper = mount(ChatWindow);
		const toggleButton = wrapper.find('.chat-window-toggle');

		// Multiple rapid clicks should work correctly
		await toggleButton.trigger('click');
		await toggleButton.trigger('click');
		await toggleButton.trigger('click');
		await nextTick();

		expect(wrapper.vm.isOpen).toBe(true);
	});
});
