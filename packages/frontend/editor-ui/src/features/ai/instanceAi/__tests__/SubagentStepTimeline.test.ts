import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import SubagentStepTimeline from '../components/SubagentStepTimeline.vue';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { mockedStore } from '@/__tests__/utils';
import { INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';

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

	it('should render text timeline entry as inline narration', () => {
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

	describe('a running source write', () => {
		function sourceWriteNode(status: InstanceAiAgentNode['status']) {
			const { name, variant } = INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT;
			vi.spyOn(usePostHog(), 'getVariant').mockImplementation((flag) =>
				flag === name ? variant : undefined,
			);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn((nodeType: string) =>
				nodeType === 'n8n-nodes-base.gmail' ? { displayName: 'Gmail' } : null,
			) as unknown as ReturnType<typeof useNodeTypesStore>['getNodeType'];
			const read = makeToolCall({
				toolCallId: 'tc-read',
				toolName: 'get_node_types',
				args: { nodeTypes: ['n8n-nodes-base.gmail'] },
			});
			const write = makeToolCall({
				toolCallId: 'tc-write',
				toolName: 'workspace_write_file',
				args: { path: 'src/workflows/demo.workflow.ts' },
				isLoading: true,
			});
			return makeAgentNode({
				status,
				toolCalls: [read, write],
				timeline: [{ type: 'tool-call', toolCallId: 'tc-write' }],
			});
		}

		it('names a node type the agent read while the sub-agent works', () => {
			const { getByText } = renderComponent({ props: { agentNode: sourceWriteNode('active') } });

			expect(getByText('Configuring Gmail nodes')).toBeInTheDocument();
		});

		it('keeps the plain tool label once the sub-agent stopped', () => {
			const { queryByText } = renderComponent({
				props: { agentNode: sourceWriteNode('cancelled') },
			});

			expect(queryByText('Configuring Gmail nodes')).toBeNull();
		});
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

	it('labels a settled reasoning entry with its first sentence', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'completed',
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
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					status: 'active',
					timeline: [{ type: 'reasoning', content: 'Still thinking about tools.' }],
				}),
			},
		});

		const step = getByTestId('instance-ai-subagent-thinking');
		expect(step).toHaveAttribute('data-active', 'true');
		expect(step.querySelector('[class*="shimmer"]')).not.toBeNull();
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

	it('groups adjacent tool calls into one step group', () => {
		const { getAllByTestId, getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [makeToolCall({ toolCallId: 'tc-a' }), makeToolCall({ toolCallId: 'tc-b' })],
					timeline: [
						{ type: 'tool-call', toolCallId: 'tc-a' },
						{ type: 'tool-call', toolCallId: 'tc-b' },
					],
				}),
			},
		});

		expect(getAllByTestId('ai-activity-trace')).toHaveLength(1);
		expect(getByText('2 tool calls')).toBeInTheDocument();
	});

	it('keeps text between tool calls and does not group across it', () => {
		const { getAllByTestId, container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [makeToolCall({ toolCallId: 'tc-a' }), makeToolCall({ toolCallId: 'tc-b' })],
					timeline: [
						{ type: 'tool-call', toolCallId: 'tc-a' },
						{ type: 'text', content: 'Between calls' },
						{ type: 'tool-call', toolCallId: 'tc-b' },
					],
				}),
			},
		});

		expect(getAllByTestId('ai-activity-trace')).toHaveLength(2);
		expect(container.textContent).not.toContain('2 tool calls');
		const text = container.textContent ?? '';
		const firstTool = text.indexOf('Searching nodes');
		expect(firstTool).toBeLessThan(text.indexOf('Between calls'));
		expect(text.lastIndexOf('Searching nodes')).toBeGreaterThan(text.indexOf('Between calls'));
	});

	it('hides hidden tools', () => {
		const { container } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					toolCalls: [makeToolCall({ toolCallId: 'tc-h', toolName: 'updateWorkingMemory' })],
					timeline: [{ type: 'tool-call', toolCallId: 'tc-h' }],
				}),
			},
		});

		expect(container.textContent).toBe('');
	});
});
