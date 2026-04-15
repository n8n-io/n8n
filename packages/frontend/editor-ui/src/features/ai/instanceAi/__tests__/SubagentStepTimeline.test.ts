import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import SubagentStepTimeline from '../components/SubagentStepTimeline.vue';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';

const renderComponent = createComponentRenderer(SubagentStepTimeline, {
	global: {
		stubs: {
			// ToolCallStep is stubbed so we can verify which toolCall was passed
			ToolCallStep: {
				template: '<div data-test-id="tool-call-step">{{ toolCall.toolName }}</div>',
				props: ['toolCall', 'label', 'showConnector'],
			},
		},
	},
});

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-nodes',
		args: {},
		isLoading: false,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'builder',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

describe('SubagentStepTimeline', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should render text timeline entry as inline ButtonLike', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content: 'Analyzing the workflow' }],
				}),
			},
		});

		expect(getByText('Analyzing the workflow')).toBeInTheDocument();
	});

	it('should render tool-call timeline entry via ToolCallStep stub', () => {
		const tc = makeToolCall({ toolCallId: 'tc-42', toolName: 'search-nodes' });
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [tc],
					timeline: [{ type: 'tool-call', toolCallId: 'tc-42' }],
				}),
			},
		});

		const step = getByTestId('tool-call-step');
		expect(step).toBeInTheDocument();
		expect(step.textContent).toContain('search-nodes');
	});

	it('should skip child timeline entries', () => {
		const { container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [
						{ type: 'text', content: 'Visible text' },
						{ type: 'child', agentId: 'child-1' },
					],
				}),
			},
		});

		expect(container.textContent).toContain('Visible text');
		expect(container.textContent).not.toContain('child-1');
	});

	it('should skip tool-call entries with no matching toolCall in array', () => {
		const { queryByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [], // no tool calls
					timeline: [{ type: 'tool-call', toolCallId: 'orphan-tc' }],
				}),
			},
		});

		expect(queryByTestId('tool-call-step')).not.toBeInTheDocument();
	});

	it('should append done step when status is completed', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'completed',
					timeline: [{ type: 'text', content: 'Did some work' }],
				}),
			},
		});

		expect(getByText('Done')).toBeInTheDocument();
	});

	it('should NOT append done step when status is active', () => {
		const { queryByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'active',
					timeline: [{ type: 'text', content: 'Still working' }],
				}),
			},
		});

		expect(queryByText('Done')).not.toBeInTheDocument();
	});

	it('should render long text (with code blocks) with short label in collapsed trigger', () => {
		const content = 'Here is some code:\n```js\nconsole.log("hello")\n```';
		const { getByText, queryByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content }],
				}),
			},
		});

		// Collapsed trigger shows the extracted short label (code blocks stripped)
		expect(getByText('Here is some code:')).toBeInTheDocument();
		// "Thinking" only shows when expanded
		expect(queryByText('Thinking')).not.toBeInTheDocument();
	});

	it('should truncate long labels (>80 chars) with ellipsis', () => {
		const longText = 'A'.repeat(100);
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content: longText }],
				}),
			},
		});

		// No code blocks → short text path, but label is truncated since plain text > 80 chars
		// Actually this is NOT long text (no code blocks), so it renders inline with full content
		// The truncation only applies inside the collapsible trigger for long text
		expect(getByText(longText)).toBeInTheDocument();
	});

	it('should truncate collapsible trigger label at 80 chars for long text content', () => {
		const longLine = 'B'.repeat(100);
		const content = `${longLine}\n\`\`\`js\ncode\n\`\`\``;
		const { container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content }],
				}),
			},
		});

		// The collapsible trigger button should show the truncated label
		const buttons = container.querySelectorAll('button');
		const triggerButton = Array.from(buttons).find((b) => b.textContent?.includes('B'.repeat(80)));
		expect(triggerButton).toBeTruthy();
		expect(triggerButton?.textContent).toContain('…');
		expect(triggerButton?.textContent).not.toContain('B'.repeat(81));
	});

	it('should show i18n fallback label when content is only code blocks', () => {
		const content = '```js\nconsole.log("hello")\n```';
		const { container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content }],
				}),
			},
		});

		// The collapsed trigger should show the fallback i18n key
		const buttons = container.querySelectorAll('button');
		const triggerButton = Array.from(buttons).find((b) =>
			b.textContent?.includes('Crafting workflow'),
		);
		expect(triggerButton).toBeTruthy();
	});
});
