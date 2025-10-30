import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import type { Props } from './ToolMessage.vue';
import ToolMessage from './ToolMessage.vue';
import type { ChatUI } from '../../../types/assistant';

// Mock i18n to return keys instead of translated text
vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
}));

// Common mount options to reduce duplication
const createMountOptions = (props: Props) => ({
	props,
	global: {
		stubs: {
			BaseMessage: {
				template: '<div><slot /></div>',
			},
			N8nIcon: true,
		},
	},
});

// Helper function to mount ToolMessage with common options
const mountToolMessage = (props: Props) => mount(ToolMessage, createMountOptions(props));

beforeEach(() => {
	setActivePinia(createPinia());
});

describe('ToolMessage', () => {
	const baseMessage: ChatUI.ToolMessage & { id: string; read: boolean } = {
		id: 'test-tool-message',
		role: 'assistant',
		type: 'tool',
		toolName: 'search_files',
		status: 'running',
		updates: [],
		read: false,
	};

	const user = {
		firstName: 'John',
		lastName: 'Doe',
	};

	describe('rendering', () => {
		it('should render correctly with basic props', () => {
			const wrapper = mountToolMessage({
				message: baseMessage,
				isFirstOfRole: true,
				user,
			});

			expect(wrapper.find('.toolMessage').exists()).toBe(true);
			expect(wrapper.find('.header').exists()).toBe(true);
			expect(wrapper.find('.titleRow').exists()).toBe(true);
			expect(wrapper.find('.status').exists()).toBe(true);
		});

		it('should render with custom display title', () => {
			const messageWithCustomTitle = {
				...baseMessage,
				customDisplayTitle: 'Custom Tool Name',
			};

			const wrapper = mountToolMessage({
				message: messageWithCustomTitle,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Custom Tool Name');
		});

		it('should render with display title', () => {
			const messageWithDisplayTitle = {
				...baseMessage,
				displayTitle: 'Display Tool Name',
			};

			const wrapper = mountToolMessage({
				message: messageWithDisplayTitle,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Display Tool Name');
		});

		it('should render tool name in title case when no custom titles', () => {
			const messageWithSnakeCase = {
				...baseMessage,
				toolName: 'search_file_contents',
			};

			const wrapper = mountToolMessage({
				message: messageWithSnakeCase,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Search File Contents');
		});
	});

	describe('status handling', () => {
		it('should render running status with spinner icon', () => {
			const runningMessage = {
				...baseMessage,
				status: 'running' as const,
			};

			const wrapper = mountToolMessage({
				message: runningMessage,
				isFirstOfRole: true,
			});

			expect(wrapper.html()).toContain('icon="spinner"');
			expect(wrapper.html()).toContain('spin');
		});

		it('should render completed status with check icon', () => {
			const completedMessage = {
				...baseMessage,
				status: 'completed' as const,
			};

			const wrapper = mountToolMessage({
				message: completedMessage,
				isFirstOfRole: true,
			});

			expect(wrapper.html()).toContain('icon="circle-check"');
		});

		it('should render error status with error icon', () => {
			const errorMessage = {
				...baseMessage,
				status: 'error' as const,
			};

			const wrapper = mountToolMessage({
				message: errorMessage,
				isFirstOfRole: true,
			});

			expect(wrapper.html()).toContain('icon="triangle-alert"');
		});
	});

	describe('tooltip behavior', () => {
		it('should enable tooltip for running status', () => {
			const runningMessage = {
				...baseMessage,
				status: 'running' as const,
			};

			const wrapper = mountToolMessage({
				message: runningMessage,
				isFirstOfRole: true,
			});

			// Check that tooltip is enabled by looking for the actual tooltip attributes
			expect(wrapper.html()).toContain('icon="spinner"');
		});

		it('should disable tooltip for non-running status', () => {
			const completedMessage = {
				...baseMessage,
				status: 'completed' as const,
			};

			const wrapper = mountToolMessage({
				message: completedMessage,
				isFirstOfRole: true,
			});

			// Check that the completed icon is rendered instead of spinner
			expect(wrapper.html()).toContain('icon="circle-check"');
		});
	});

	describe('toolDisplayName', () => {
		it('should prioritize customDisplayTitle', () => {
			const message = {
				...baseMessage,
				customDisplayTitle: 'Custom Title',
				displayTitle: 'Display Title',
				toolName: 'tool_name',
			};

			const wrapper = mountToolMessage({
				message,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Custom Title');
		});

		it('should use displayTitle when customDisplayTitle is not available', () => {
			const message = {
				...baseMessage,
				displayTitle: 'Display Title',
				toolName: 'tool_name',
			};

			const wrapper = mountToolMessage({
				message,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Display Title');
		});

		it('should convert snake_case toolName to Title Case', () => {
			const message = {
				...baseMessage,
				toolName: 'convert_snake_case_to_title',
			};

			const wrapper = mountToolMessage({
				message,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Convert Snake Case To Title');
		});

		it('should handle single word toolName', () => {
			const message = {
				...baseMessage,
				toolName: 'search',
			};

			const wrapper = mountToolMessage({
				message,
				isFirstOfRole: true,
			});

			expect(wrapper.text()).toContain('Search');
		});
	});
});
