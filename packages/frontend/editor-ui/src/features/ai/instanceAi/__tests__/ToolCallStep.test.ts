import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ToolCallStep from '../components/ToolCallStep.vue';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const renderComponent = createComponentRenderer(ToolCallStep, {
	global: {
		stubs: {
			CollapsibleRoot: { template: '<div><slot /></div>' },
			CollapsibleTrigger: { template: '<button><slot /></button>' },
			CollapsibleContent: { template: '<div><slot /></div>' },
			ToolResultJson: { template: '<pre data-test-id="tool-result-json" />' },
			ToolResultRenderer: { template: '<div data-test-id="tool-result-renderer" />' },
		},
	},
});

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-nodes',
		args: { query: 'slack' },
		isLoading: false,
		...overrides,
	};
}

describe('ToolCallStep', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should render without throwing', () => {
		expect(() => renderComponent({ props: { toolCall: makeToolCall() } })).not.toThrow();
	});

	it('should display the tool label', () => {
		const { container } = renderComponent({
			props: { toolCall: makeToolCall({ toolName: 'search-nodes' }) },
		});

		const label = container.querySelector('span');
		expect(label).toBeTruthy();
		expect(label?.textContent?.trim()).toBeTruthy();
	});

	it('should use custom label when provided', () => {
		const { getByText } = renderComponent({
			props: { toolCall: makeToolCall(), label: 'Custom Label' },
		});

		expect(getByText('Custom Label')).toBeInTheDocument();
	});

	it('should show connector when showConnector is true', () => {
		const { container } = renderComponent({
			props: { toolCall: makeToolCall(), showConnector: true },
		});

		const connectors = container.querySelectorAll('div');
		const hasConnector = Array.from(connectors).some((el) => el.className.includes('connector'));
		expect(hasConnector).toBe(true);
	});

	it('should not show connector when showConnector is false', () => {
		const { container } = renderComponent({
			props: { toolCall: makeToolCall(), showConnector: false },
		});

		const connectors = Array.from(container.querySelectorAll('div')).filter((el) =>
			el.className.includes('connector'),
		);
		expect(connectors).toHaveLength(0);
	});

	it('should show spinner icon when loading', () => {
		const { container } = renderComponent({
			props: { toolCall: makeToolCall({ isLoading: true }) },
		});

		const icons = container.querySelectorAll('[class*="loadingIcon"]');
		expect(icons.length).toBeGreaterThan(0);
	});

	it('should show toggle button for toggleable tools', () => {
		const { container } = renderComponent({
			props: {
				toolCall: makeToolCall({
					toolName: 'search-nodes',
					result: { nodes: [] },
				}),
			},
		});

		const buttons = container.querySelectorAll('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('should not show toggle for non-toggleable tools', () => {
		const { container } = renderComponent({
			props: {
				toolCall: makeToolCall({ toolName: 'plan' }),
			},
		});

		const buttons = container.querySelectorAll('button');
		expect(buttons).toHaveLength(0);
	});

	it('should show error text when tool call has error', () => {
		const { getByText } = renderComponent({
			props: {
				toolCall: makeToolCall({
					error: 'Something went wrong',
					result: undefined,
				}),
			},
		});

		expect(getByText('Something went wrong')).toBeInTheDocument();
	});

	it('should append role to delegate tool label', () => {
		const { getByText } = renderComponent({
			props: {
				toolCall: makeToolCall({
					toolName: 'delegate',
					args: { role: 'workflow-builder' },
				}),
			},
		});

		const label = getByText(/workflow-builder/);
		expect(label).toBeInTheDocument();
	});

	it('should append query to web-search tool label', () => {
		const { getByText } = renderComponent({
			props: {
				toolCall: makeToolCall({
					toolName: 'web-search',
					args: { query: 'n8n docs' },
				}),
			},
		});

		const label = getByText(/n8n docs/);
		expect(label).toBeInTheDocument();
	});

	it('should render slot content', () => {
		const { getByText } = renderComponent({
			props: { toolCall: makeToolCall() },
			slots: { default: '<span>Slot Content</span>' },
		});

		expect(getByText('Slot Content')).toBeInTheDocument();
	});

	it('should show result data when toggle is expanded', async () => {
		const { getByTestId } = renderComponent({
			props: {
				toolCall: makeToolCall({
					result: { nodes: ['Slack'] },
				}),
			},
		});

		// With stubs, CollapsibleContent renders immediately
		expect(getByTestId('tool-result-renderer')).toBeInTheDocument();
	});

	it('should show args data when toggle is expanded', async () => {
		const { getByTestId } = renderComponent({
			props: {
				toolCall: makeToolCall({
					args: { query: 'test' },
					result: { data: [] },
				}),
			},
		});

		expect(getByTestId('tool-result-json')).toBeInTheDocument();
	});
});
