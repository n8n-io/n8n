import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ToolMessage from '../ToolMessage.vue';
import type { ChatUI } from '@n8n/chat';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.toolExecution': 'Tool Execution',
				'assistantChat.input': 'Input',
				'assistantChat.output': 'Output',
				'assistantChat.progress': 'Progress',
				'assistantChat.error': 'Error',
				'assistantChat.expand': 'Expand',
				'assistantChat.collapse': 'Collapse',
				'assistantChat.running': 'Running',
				'assistantChat.completed': 'Completed',
				'assistantChat.failed': 'Failed',
			};
			return translations[key] || key;
		}),
	})),
}));

const stubs = {
	'n8n-icon': {
		template: '<span class="n8n-icon" :data-icon="icon" />',
		props: ['icon'],
	},
	'n8n-button': {
		template:
			'<button class="n8n-button" @click="$emit(\'click\')" :disabled="disabled"><slot /></button>',
		props: ['disabled', 'type', 'size'],
		emits: ['click'],
	},
	'n8n-tooltip': {
		template: '<div class="n8n-tooltip" :data-content="content"><slot /></div>',
		props: ['content', 'placement'],
	},
};

type ToolStatus = 'running' | 'completed' | 'error';

const createToolMessage = (overrides: Partial<ChatUI.ToolMessage> = {}): ChatUI.ToolMessage => ({
	id: '1',
	type: 'tool',
	role: 'assistant',
	toolName: 'test_tool',
	status: 'completed',
	input: { param1: 'value1', param2: 'value2' },
	output: { result: 'success', data: [1, 2, 3] },
	read: false,
	...overrides,
});

describe('ToolMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render tool message correctly', () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			expect(wrapper.container.textContent).toContain('Test Tool');
		});

		it('should transform tool name from snake_case to Title Case', () => {
			const testCases = [
				{ input: 'test_tool', expected: 'Test Tool' },
				{ input: 'api_request_handler', expected: 'Api Request Handler' },
				{ input: 'simple_tool', expected: 'Simple Tool' },
				{ input: 'complex_data_processor', expected: 'Complex Data Processor' },
			];

			testCases.forEach(({ input, expected }) => {
				const message = createToolMessage({ toolName: input });
				const wrapper = render(ToolMessage, {
					props: { message },
					global: { stubs },
				});

				expect(wrapper.container.textContent).toContain(expected);
			});
		});

		it('should display tool status icon', () => {
			const statusConfigs = [
				{ status: 'running', expectedIcon: 'spinner' },
				{ status: 'completed', expectedIcon: 'check-circle' },
				{ status: 'error', expectedIcon: 'exclamation-triangle' },
			] as const;

			statusConfigs.forEach(({ status, expectedIcon }) => {
				const message = createToolMessage({ status });
				const wrapper = render(ToolMessage, {
					props: { message },
					global: { stubs },
				});

				const statusIcon = wrapper.container.querySelector('.n8n-icon');
				expect(statusIcon).toHaveAttribute('data-icon', expectedIcon);
			});
		});

		it('should apply status-specific CSS classes', () => {
			const statuses: ToolStatus[] = ['running', 'completed', 'error'];

			statuses.forEach((status) => {
				const message = createToolMessage({ status });
				const wrapper = render(ToolMessage, {
					props: { message },
					global: { stubs },
				});

				const container = wrapper.container.querySelector('.tool-message');
				expect(container).toHaveClass(status);
			});
		});
	});

	describe('Expandable/Collapsible Behavior', () => {
		it('should be collapsed by default', () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const expandedContent = wrapper.container.querySelector('.tool-details');
			expect(expandedContent).not.toBeVisible();
		});

		it('should expand when header is clicked', async () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const expandedContent = wrapper.container.querySelector('.tool-details');
			expect(expandedContent).toBeVisible();
		});

		it('should toggle expand/collapse on multiple clicks', async () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			const details = wrapper.container.querySelector('.tool-details');

			// Initially collapsed
			expect(details).not.toBeVisible();

			// Click to expand
			await fireEvent.click(header!);
			expect(details).toBeVisible();

			// Click to collapse
			await fireEvent.click(header!);
			expect(details).not.toBeVisible();
		});

		it('should show appropriate expand/collapse icons', async () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const expandIcon = wrapper.container.querySelector('.expand-icon');
			expect(expandIcon).toHaveAttribute('data-icon', 'chevron-right');

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			expect(expandIcon).toHaveAttribute('data-icon', 'chevron-down');
		});

		it('should update expand/collapse button text', async () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Expand');

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			expect(wrapper.container.textContent).toContain('Collapse');
		});
	});

	describe('Tool Input Display', () => {
		it('should display tool input when expanded', async () => {
			const message = createToolMessage({
				input: { param1: 'value1', param2: 42, param3: true },
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const inputSection = wrapper.container.querySelector('.tool-input');
			expect(inputSection).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Input');
		});

		it('should format input as JSON', async () => {
			const inputData = {
				stringParam: 'test',
				numberParam: 123,
				booleanParam: true,
				arrayParam: [1, 2, 3],
				objectParam: { nested: 'value' },
			};
			const message = createToolMessage({ input: inputData });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const inputContent = wrapper.container.querySelector('.tool-input .json-content');
			expect(inputContent?.textContent).toContain('"stringParam": "test"');
			expect(inputContent?.textContent).toContain('"numberParam": 123');
		});

		it('should handle empty input gracefully', async () => {
			const message = createToolMessage({ input: {} });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const inputSection = wrapper.container.querySelector('.tool-input');
			expect(inputSection).toBeInTheDocument();
		});

		it('should handle null/undefined input', async () => {
			const message = createToolMessage({ input: null as any });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Tool Output Display', () => {
		it('should display tool output when expanded', async () => {
			const message = createToolMessage({
				output: { result: 'success', data: [1, 2, 3] },
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const outputSection = wrapper.container.querySelector('.tool-output');
			expect(outputSection).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Output');
		});

		it('should format output as JSON', async () => {
			const outputData = {
				success: true,
				message: 'Operation completed',
				results: [{ id: 1, name: 'Item 1' }],
			};
			const message = createToolMessage({ output: outputData });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const outputContent = wrapper.container.querySelector('.tool-output .json-content');
			expect(outputContent?.textContent).toContain('"success": true');
			expect(outputContent?.textContent).toContain('Item 1');
		});

		it('should handle large output data', async () => {
			const largeOutput = {
				data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
			};
			const message = createToolMessage({ output: largeOutput });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const outputSection = wrapper.container.querySelector('.tool-output');
			expect(outputSection).toBeInTheDocument();
		});

		it('should not display output section when output is empty', async () => {
			const message = createToolMessage({ output: null });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const outputSection = wrapper.container.querySelector('.tool-output');
			expect(outputSection).not.toBeInTheDocument();
		});
	});

	describe('Progress Messages Display', () => {
		it('should display progress messages when showProgressLogs is true', async () => {
			const message = createToolMessage({
				progressMessages: [
					{ timestamp: new Date().toISOString(), message: 'Starting execution' },
					{ timestamp: new Date().toISOString(), message: 'Processing data' },
					{ timestamp: new Date().toISOString(), message: 'Finalizing results' },
				],
			});
			const wrapper = render(ToolMessage, {
				props: { message, showProgressLogs: true },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const progressSection = wrapper.container.querySelector('.tool-progress');
			expect(progressSection).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Starting execution');
			expect(wrapper.container.textContent).toContain('Processing data');
		});

		it('should not display progress messages when showProgressLogs is false', async () => {
			const message = createToolMessage({
				progressMessages: [{ timestamp: new Date().toISOString(), message: 'Starting execution' }],
			});
			const wrapper = render(ToolMessage, {
				props: { message, showProgressLogs: false },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const progressSection = wrapper.container.querySelector('.tool-progress');
			expect(progressSection).not.toBeInTheDocument();
		});

		it('should format progress timestamps', async () => {
			const message = createToolMessage({
				progressMessages: [
					{
						timestamp: '2023-01-01T12:30:45Z',
						message: 'Test message',
					},
				],
			});
			const wrapper = render(ToolMessage, {
				props: { message, showProgressLogs: true },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			expect(wrapper.container.textContent).toContain('12:30:45');
		});

		it('should handle empty progress messages', async () => {
			const message = createToolMessage({ progressMessages: [] });
			const wrapper = render(ToolMessage, {
				props: { message, showProgressLogs: true },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const progressSection = wrapper.container.querySelector('.tool-progress');
			expect(progressSection).not.toBeInTheDocument();
		});
	});

	describe('Error Handling and Display', () => {
		it('should display error information for failed tools', async () => {
			const message = createToolMessage({
				status: 'error',
				error: {
					message: 'Tool execution failed',
					code: 'EXEC_ERROR',
					stack: 'Error stack trace here...',
				},
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const errorSection = wrapper.container.querySelector('.tool-error');
			expect(errorSection).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Tool execution failed');
			expect(wrapper.container.textContent).toContain('EXEC_ERROR');
		});

		it('should apply error styling for failed tools', () => {
			const message = createToolMessage({ status: 'error' });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.tool-message');
			expect(container).toHaveClass('error');
		});

		it('should show error details in expandable format', async () => {
			const message = createToolMessage({
				status: 'error',
				error: {
					message: 'Network timeout',
					details: { timeout: 5000, retries: 3 },
				},
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const errorDetails = wrapper.container.querySelector('.error-details');
			expect(errorDetails).toBeInTheDocument();
		});

		it('should handle tools without error information gracefully', async () => {
			const message = createToolMessage({ status: 'error', error: null });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Status Indicators and Tooltips', () => {
		it('should show status tooltips', () => {
			const statusConfigs = [
				{ status: 'running', expectedTooltip: 'Tool is currently running' },
				{ status: 'completed', expectedTooltip: 'Tool completed successfully' },
				{ status: 'error', expectedTooltip: 'Tool execution failed' },
			] as const;

			statusConfigs.forEach(({ status, expectedTooltip }) => {
				const message = createToolMessage({ status });
				const wrapper = render(ToolMessage, {
					props: { message },
					global: { stubs },
				});

				const tooltip = wrapper.container.querySelector('.n8n-tooltip');
				expect(tooltip).toHaveAttribute('data-content', expect.stringContaining('Tool'));
			});
		});

		it('should show execution time when available', () => {
			const message = createToolMessage({
				status: 'completed',
				executionTime: 2500, // 2.5 seconds
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('2.5s');
		});

		it('should show running animation for active tools', () => {
			const message = createToolMessage({ status: 'running' });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const statusIcon = wrapper.container.querySelector('.n8n-icon');
			expect(statusIcon).toHaveClass('spinning');
		});

		it('should display progress percentage when available', () => {
			const message = createToolMessage({
				status: 'running',
				progress: 65,
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('65%');
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes', () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const container = wrapper.container.querySelector('.tool-message');
			expect(container).toHaveAttribute('role', 'region');
			expect(container).toHaveAttribute('aria-label', expect.stringContaining('Test Tool'));
		});

		it('should have accessible expand/collapse controls', () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			expect(header).toHaveAttribute('role', 'button');
			expect(header).toHaveAttribute('aria-expanded', 'false');
			expect(header).toHaveAttribute('tabindex', '0');
		});

		it('should update aria-expanded when toggling', async () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			expect(header).toHaveAttribute('aria-expanded', 'false');

			await fireEvent.click(header!);
			expect(header).toHaveAttribute('aria-expanded', 'true');
		});

		it('should support keyboard navigation', async () => {
			const message = createToolMessage();
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');

			// Should be focusable
			expect(header).toHaveAttribute('tabindex', '0');

			// Should respond to Enter key
			await fireEvent.keyDown(header!, { key: 'Enter' });
			expect(header).toHaveAttribute('aria-expanded', 'true');

			// Should respond to Space key
			await fireEvent.keyDown(header!, { key: ' ' });
			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('should have proper status announcements', () => {
			const message = createToolMessage({ status: 'running' });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const statusElement = wrapper.container.querySelector('.tool-status');
			expect(statusElement).toHaveAttribute('aria-live', 'polite');
		});
	});

	describe('JSON Data Display', () => {
		it('should syntax highlight JSON data', async () => {
			const message = createToolMessage({
				input: { string: 'value', number: 42, boolean: true },
			});
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const jsonContent = wrapper.container.querySelector('.json-content');
			expect(jsonContent).toHaveClass('highlighted');
		});

		it('should handle deeply nested objects', async () => {
			const complexData = {
				level1: {
					level2: {
						level3: {
							deep: 'value',
							array: [1, 2, { nested: true }],
						},
					},
				},
			};
			const message = createToolMessage({ output: complexData });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			const jsonContent = wrapper.container.querySelector('.json-content');
			expect(jsonContent?.textContent).toContain('level3');
			expect(jsonContent?.textContent).toContain('nested');
		});

		it('should handle circular references gracefully', async () => {
			const circularData: any = { name: 'test' };
			circularData.self = circularData; // Create circular reference

			const message = createToolMessage({ output: circularData });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			// Should not crash and should display something meaningful
			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle message type inconsistency', () => {
			const message = { ...createToolMessage(), type: 'not-tool' as any };
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle missing toolName gracefully', () => {
			const message = { ...createToolMessage(), toolName: undefined as any };
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Unknown Tool');
		});

		it('should handle empty toolName', () => {
			const message = createToolMessage({ toolName: '' });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Unknown Tool');
		});

		it('should handle tools with special characters in names', () => {
			const specialNames = [
				'tool-with-dashes',
				'tool.with.dots',
				'tool@with#symbols',
				'tool with spaces',
			];

			specialNames.forEach((toolName) => {
				const message = createToolMessage({ toolName });
				const wrapper = render(ToolMessage, {
					props: { message },
					global: { stubs },
				});

				expect(wrapper.container).toBeInTheDocument();
			});
		});

		it('should handle extremely long tool names', () => {
			const longName =
				'very_long_tool_name_that_exceeds_normal_limits_and_tests_ui_handling'.repeat(5);
			const message = createToolMessage({ toolName: longName });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Performance', () => {
		it('should handle frequent status updates efficiently', async () => {
			const message = createToolMessage({ status: 'running' });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const statuses: ToolStatus[] = ['running', 'completed', 'error'];

			// Simulate frequent status changes
			for (let i = 0; i < 20; i++) {
				const newStatus = statuses[i % statuses.length];
				await wrapper.rerender({
					message: createToolMessage({ status: newStatus }),
				});
			}

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should not cause memory leaks with large data', async () => {
			const hugeData = {
				largeArray: Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item-${i}` })),
			};
			const message = createToolMessage({ output: hugeData });
			const wrapper = render(ToolMessage, {
				props: { message },
				global: { stubs },
			});

			const header = wrapper.container.querySelector('.tool-header');
			await fireEvent.click(header!);

			// Verify component can be unmounted cleanly
			wrapper.unmount();
			expect(wrapper.container.innerHTML).toBe('');
		});
	});
});
