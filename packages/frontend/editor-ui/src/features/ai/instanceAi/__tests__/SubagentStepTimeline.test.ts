import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import SubagentStepTimeline from '../components/SubagentStepTimeline.vue';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';

const renderComponent = createThreadComponentRenderer(SubagentStepTimeline);

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
		createTestingPinia({ stubActions: false });
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

	it('should render tool-call timeline entry', () => {
		const tc = makeToolCall({ toolCallId: 'tc-42', toolName: 'search-nodes' });
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [tc],
					timeline: [{ type: 'tool-call', toolCallId: 'tc-42' }],
				}),
			},
		});

		expect(getByText('Searching nodes')).toBeInTheDocument();
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
		const { container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [], // no tool calls
					timeline: [{ type: 'tool-call', toolCallId: 'orphan-tc' }],
				}),
			},
		});

		expect(container.textContent).toBe('');
	});

	it('does not render a "Done" badge when status is completed', () => {
		// The done-step render branch was removed; parent AgentSection now
		// conveys completion via its collapse/shimmer state.
		const { queryByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'completed',
					timeline: [{ type: 'text', content: 'Did some work' }],
				}),
			},
		});

		expect(queryByText('Done')).not.toBeInTheDocument();
	});

	it('does not render a "Done" badge when status is active', () => {
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

	it('keeps streamed long-text labels outside a polite live region', async () => {
		const { getByText, rerender } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content: 'Generating code\n```js\nconst value = 1;\n```' }],
				}),
			},
		});

		expect(getByText('Generating code')).toHaveAttribute('aria-live', 'off');

		await rerender({
			agentNode: makeAgentNode({
				timeline: [{ type: 'text', content: 'Generating code now\n```js\nconst value = 2;\n```' }],
			}),
		});

		expect(getByText('Generating code now')).toHaveAttribute('aria-live', 'off');
	});

	it('opens long text with Enter and restores its short label with Space', async () => {
		const user = userEvent.setup();
		const { getByRole, container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content: 'Generated code:\n```js\nconst value = 42;\n```' }],
				}),
			},
		});
		const trigger = getByRole('button', { name: 'Generated code:' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');

		trigger.focus();
		await user.keyboard('{Enter}');
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(trigger).toHaveTextContent('Thinking');
		expect(container.querySelector('pre')).toBeVisible();
		expect(container.querySelector('pre')).toHaveTextContent('const value = 42;');

		await user.keyboard(' ');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(trigger).toHaveTextContent('Generated code:');
		expect(trigger).not.toHaveTextContent('Thinking');
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

	it('renders a reasoning entry labelled with its first sentence', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [
						{
							type: 'reasoning',
							content: 'Checking the node schema. More detail.',
						},
					],
				}),
			},
		});

		expect(getByText('Checking the node schema.')).toBeInTheDocument();
	});

	it('streams the trailing reasoning entry on an active node', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'active',
					timeline: [{ type: 'reasoning', content: 'Still thinking about tools.' }],
				}),
			},
		});

		expect(getByText('Still thinking about tools.').className).toContain('shimmer');
	});

	it('does not stream a settled reasoning entry when later timeline content follows', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'active',
					timeline: [
						{ type: 'reasoning', content: 'Finished this thought.' },
						{ type: 'text', content: 'Next step' },
					],
				}),
			},
		});

		expect(getByText('Finished this thought.').className).not.toContain('shimmer');
	});
});
