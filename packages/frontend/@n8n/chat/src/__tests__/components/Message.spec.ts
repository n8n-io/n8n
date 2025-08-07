import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';

import Message from '@/components/Message.vue';
import { useOptions } from '@/composables';
import type { ChatMessageText, ChatMessageComponent } from '@/types';

// Mock the composables
vi.mock('@/composables', () => ({
	useOptions: vi.fn(),
}));

// Mock ChatFile component
vi.mock('@/components/ChatFile.vue', () => ({
	default: {
		name: 'ChatFile',
		template: '<div data-testid="chat-file" />',
		props: ['file', 'isRemovable', 'isPreviewable'],
	},
}));

// Mock VueMarkdown
vi.mock('vue-markdown-render', () => ({
	default: {
		name: 'VueMarkdown',
		template: '<div data-testid="vue-markdown">{{ source }}</div>',
		props: ['source', 'options', 'plugins'],
	},
}));

// Mock highlight.js
vi.mock('highlight.js/lib/core', () => ({
	default: {
		registerLanguage: vi.fn(),
		getLanguage: vi.fn(),
		highlight: vi.fn(),
	},
}));

// Mock FileReader for file tests
global.FileReader = class MockFileReader {
	result: string | null = null;
	onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
	onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

	readAsDataURL(_file: Blob) {
		setTimeout(() => {
			this.result = 'data:image/png;base64,fake-data-url';
			if (this.onload) {
				this.onload.call(this, {} as ProgressEvent<FileReader>);
			}
		}, 0);
	}
} as any;

describe('Message.vue', () => {
	let mockOptions: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockOptions = {
			options: {
				messageComponents: {},
			},
		};

		vi.mocked(useOptions).mockReturnValue(mockOptions);
	});

	it('should render text message from user', () => {
		const message: ChatMessageText = {
			id: '1',
			text: 'Hello from user',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.classes()).toContain('chat-message-from-user');
		expect(wrapper.find('[data-testid="vue-markdown"]').text()).toBe('Hello from user');
	});

	it('should render text message from bot', () => {
		const message: ChatMessageText = {
			id: '2',
			text: 'Hello from bot',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.classes()).toContain('chat-message-from-bot');
		expect(wrapper.find('[data-testid="vue-markdown"]').text()).toBe('Hello from bot');
	});

	it('should render transparent message with correct class', () => {
		const message: ChatMessageText = {
			id: '3',
			text: 'Transparent message',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'text',
			transparent: true,
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.classes()).toContain('chat-message-transparent');
	});

	it('should render empty response placeholder when text is empty', () => {
		const message: ChatMessageText = {
			id: '4',
			text: '',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.find('[data-testid="vue-markdown"]').text()).toBe('&lt;Empty response&gt;');
	});

	it('should render component message when type is component and component exists', async () => {
		const TestComponent = {
			name: 'TestComponent',
			template: '<div data-testid="custom-component">Custom Component</div>',
			props: ['title'],
		};

		mockOptions.options.messageComponents = {
			'test-component': TestComponent,
		};

		const message: ChatMessageComponent = {
			id: '5',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'component',
			key: 'test-component',
			arguments: { title: 'Test Title' },
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		await nextTick();

		expect(wrapper.find('[data-testid="custom-component"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="vue-markdown"]').exists()).toBe(false);
	});

	it('should fall back to markdown when component does not exist', () => {
		const message = {
			id: '6',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'component',
			key: 'non-existent-component',
			arguments: {},
		} as any;

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.find('[data-testid="vue-markdown"]').exists()).toBe(true);
	});

	it('should render files when message has files', async () => {
		const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

		const message: ChatMessageText = {
			id: '7',
			text: 'Message with file',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
			files: [mockFile],
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		await nextTick();

		expect(wrapper.find('.chat-message-files').exists()).toBe(true);
		expect(wrapper.find('[data-testid="chat-file"]').exists()).toBe(true);
	});

	it('should handle multiple files', async () => {
		const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
		const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

		const message: ChatMessageText = {
			id: '8',
			text: 'Message with multiple files',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
			files: [file1, file2],
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		await nextTick();

		const fileComponents = wrapper.findAll('[data-testid="chat-file"]');
		expect(fileComponents).toHaveLength(2);
	});

	it('should not render files section when no files', () => {
		const message: ChatMessageText = {
			id: '9',
			text: 'Message without files',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.find('.chat-message-files').exists()).toBe(false);
	});

	it('should render beforeMessage slot when provided', () => {
		const message: ChatMessageText = {
			id: '10',
			text: 'Message with actions',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
			slots: {
				beforeMessage: '<div data-testid="message-actions">Actions</div>',
			},
		});

		expect(wrapper.find('.chat-message-actions').exists()).toBe(true);
		expect(wrapper.find('[data-testid="message-actions"]').exists()).toBe(true);
	});

	it('should not render beforeMessage section when slot is not provided', () => {
		const message: ChatMessageText = {
			id: '11',
			text: 'Message without actions',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.find('.chat-message-actions').exists()).toBe(false);
	});

	it('should render custom message content via default slot', () => {
		const message: ChatMessageText = {
			id: '12',
			text: 'Original text',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
			slots: {
				default: '<div data-testid="custom-content">Custom Content</div>',
			},
		});

		expect(wrapper.find('[data-testid="custom-content"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="vue-markdown"]').exists()).toBe(false);
	});

	it('should expose scrollToView method', () => {
		const message: ChatMessageText = {
			id: '13',
			text: 'Test message',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		expect(wrapper.vm.scrollToView).toBeDefined();
		expect(typeof wrapper.vm.scrollToView).toBe('function');
	});

	it('should call scrollIntoView when scrollToView is called', () => {
		const mockScrollIntoView = vi.fn();
		const message: ChatMessageText = {
			id: '14',
			text: 'Test message',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		// Mock the DOM element's scrollIntoView method
		const messageElement = wrapper.vm.$refs.messageContainer as HTMLElement;
		messageElement.scrollIntoView = mockScrollIntoView;

		wrapper.vm.scrollToView();

		expect(mockScrollIntoView).toHaveBeenCalledWith({ block: 'start' });
	});

	it('should handle error when reading file fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock FileReader to simulate error
		global.FileReader = class MockFileReader {
			result: string | null = null;
			onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
			onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

			readAsDataURL(_file: Blob) {
				setTimeout(() => {
					if (this.onerror) {
						this.onerror.call(this, {} as ProgressEvent<FileReader>);
					}
				}, 0);
			}
		} as any;

		const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

		const message: ChatMessageText = {
			id: '15',
			text: 'Message with problematic file',
			sender: 'user',
			createdAt: '2023-01-01',
			type: 'text',
			files: [mockFile],
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		await nextTick();
		await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for FileReader

		expect(consoleSpy).toHaveBeenCalledWith('Error reading file:', expect.any(Object));

		consoleSpy.mockRestore();
	});

	it('should pass markdown options and plugins to VueMarkdown', () => {
		const message: ChatMessageText = {
			id: '16',
			text: 'Test markdown',
			sender: 'bot',
			createdAt: '2023-01-01',
			type: 'text',
		};

		const wrapper = mount(Message, {
			props: { message },
		});

		const vueMarkdown = wrapper.findComponent({ name: 'VueMarkdown' });
		expect(vueMarkdown.props('options')).toBeDefined();
		expect(vueMarkdown.props('plugins')).toBeDefined();
		expect(Array.isArray(vueMarkdown.props('plugins'))).toBe(true);
	});
});
