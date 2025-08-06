import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import Input from '../components/Input.vue';

const mockReset = vi.fn();
const mockOpen = vi.fn();
const mockOnChange = vi.fn();

vi.mock('@vueuse/core', () => ({
	useFileDialog: vi.fn(() => ({
		open: mockOpen,
		reset: mockReset,
		onChange: mockOnChange,
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
		sendMessage: vi.fn().mockResolvedValue({ executionId: 'exec-123' }),
		ws: null,
	}),
	useOptions: () => ({
		options: {
			disabled: { value: false },
			allowFileUploads: true, // Make this a direct boolean instead of reactive
			allowedFilesMimeTypes: 'image/*,text/*', // Make this a direct string instead of reactive
			webhookUrl: 'https://example.com/webhook',
		},
	}),
}));

vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		on: vi.fn(),
		off: vi.fn(),
		emit: vi.fn(),
	},
}));

vi.mock('@n8n/chat/utils', () => ({
	constructChatWebsocketUrl: vi
		.fn()
		.mockReturnValue('ws://localhost:5678/webhook/chat/session-123?executionId=exec-123'),
}));

vi.mock('./ChatFile.vue', () => ({
	default: { name: 'ChatFile' },
}));

describe('Input Component', () => {
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

		// Mock ResizeObserver
		global.ResizeObserver = vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			disconnect: vi.fn(),
		}));

		// Mock FileReader
		global.FileReader = vi.fn().mockImplementation(() => ({
			readAsDataURL: vi.fn(),
			onload: null,
			onerror: null,
			result: 'data:text/plain;base64,dGVzdA==',
		}));

		// Mock DataTransfer for file handling tests
		global.DataTransfer = vi.fn().mockImplementation(() => ({
			items: {
				add: vi.fn(),
			},
			files: [],
		}));

		wrapper = mount(Input);
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
		vi.clearAllMocks();
	});

	it('renders the component with default props', () => {
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
		expect(textarea.element.value).toBe('Hello world');
	});

	it('shows file upload button when allowed', () => {
		expect(wrapper.find('[data-test-id="chat-attach-file-button"]').exists()).toBe(true);
	});

	it('handles empty file list gracefully', () => {
		expect(() => wrapper.vm.attachFiles()).not.toThrow();
		expect(wrapper.vm.attachFiles()).toEqual([]);
	});

	it('adjusts textarea height correctly', () => {
		const mockTextarea = {
			style: { height: '' },
			scrollHeight: 100,
		};
		wrapper.vm.chatTextArea = mockTextarea;

		wrapper.vm.adjustTextAreaHeight();

		expect(mockTextarea.style.height).toBe('100px');
	});

	it('focuses input when requested', () => {
		const mockTextarea = { focus: vi.fn() };
		wrapper.vm.chatTextArea = mockTextarea;

		wrapper.vm.focusChatInput();

		expect(mockTextarea.focus).toHaveBeenCalled();
	});

	it('blurs input when requested', () => {
		const mockTextarea = { blur: vi.fn() };
		wrapper.vm.chatTextArea = mockTextarea;

		wrapper.vm.blurChatInput();

		expect(mockTextarea.blur).toHaveBeenCalled();
	});

	it('sets input value and focuses', () => {
		const mockTextarea = { focus: vi.fn() };
		wrapper.vm.chatTextArea = mockTextarea;

		wrapper.vm.setInputValue('New value');

		expect(wrapper.vm.input).toBe('New value');
		expect(mockTextarea.focus).toHaveBeenCalled();
	});

	it('computes submit disabled state correctly', async () => {
		// Empty input should disable submit button
		wrapper.vm.input = '';
		await wrapper.vm.$nextTick();
		const sendButton = wrapper.find('.chat-input-send-button');
		expect(sendButton.attributes('disabled')).toBeDefined();

		// Non-empty input should enable submit button
		wrapper.vm.input = 'test';
		await wrapper.vm.$nextTick();
		expect(sendButton.attributes('disabled')).toBeFalsy();
	});

	it('computes style variables correctly', async () => {
		// Wait for component to be fully mounted and reactive properties to be set
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.styleVars).toEqual({
			'--controls-count': 2, // file upload + send button
		});
	});

	it('handles file removal correctly', () => {
		const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });

		// Create a mock FileList using our mocked DataTransfer
		const dt = new DataTransfer();
		dt.items.add(mockFile);
		// Mock files property to simulate having files
		const mockFileList = [mockFile];
		Object.defineProperty(mockFileList, 'length', { value: 1 });
		wrapper.vm.files = mockFileList as unknown as FileList;

		wrapper.vm.onFileRemove(mockFile);

		// After removal, should have called reset
		expect(mockReset).toHaveBeenCalled();
	});

	it('processes files correctly', async () => {
		const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
		const mockFileReader = {
			readAsDataURL: vi.fn(),
			onload: null,
			onerror: null,
			result: 'data:text/plain;base64,dGVzdA==',
		};

		global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

		const promise = wrapper.vm.processFiles([mockFile]);

		// Simulate successful file read
		if (mockFileReader.onload) {
			mockFileReader.onload();
		}

		const result = await promise;
		expect(result).toEqual([
			{
				name: 'test.txt',
				type: 'text/plain',
				data: 'data:text/plain;base64,dGVzdA==',
			},
		]);
	});

	it('sets up WebSocket connection correctly', () => {
		const executionId = 'exec-123';
		wrapper.vm.setupWebsocketConnection(executionId);

		expect(global.WebSocket).toHaveBeenCalledWith(
			'ws://localhost:5678/webhook/chat/session-123?executionId=exec-123',
		);
	});

	it('prevents submit when input is empty', async () => {
		wrapper.vm.input = '';
		const event = new MouseEvent('click');
		const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

		await wrapper.vm.onSubmit(event);

		expect(preventDefaultSpy).toHaveBeenCalled();
	});
});
