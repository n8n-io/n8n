import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import InstanceAiMessageComponent from '../components/InstanceAiMessage.vue';
import type { InstanceAiMessage, InstanceAiAgentNode } from '@n8n/api-types';

vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: {
		template: '<span>{{ source.content }}</span>',
		props: ['source'],
	},
}));

const renderComponent = createComponentRenderer(InstanceAiMessageComponent, {
	global: {
		stubs: {
			AgentActivityTree: {
				template: '<div data-test-id="agent-activity-tree" />',
				props: ['agentNode', 'isRoot'],
			},
		},
	},
});

function makeAgentTree(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe('InstanceAiMessage', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should render user message with user bubble', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				message: makeMessage({ role: 'user', content: 'Hello there' }),
			},
		});

		expect(getByTestId('instance-ai-user-message')).toBeInTheDocument();
		expect(getByText('Hello there')).toBeInTheDocument();
	});

	it('should render assistant message with assistant wrapper', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				message: makeMessage({ role: 'assistant', content: 'Hi!' }),
			},
		});

		expect(getByTestId('instance-ai-assistant-message')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-user-message')).not.toBeInTheDocument();
	});

	it('should show error callout when agentTree has error status and error text', () => {
		const { getByText } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'Something went wrong',
					}),
				}),
			},
		});

		expect(getByText('Something went wrong')).toBeInTheDocument();
	});

	it('should NOT show error callout when agentTree error text is missing', () => {
		const { queryByRole } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						// no error text
					}),
				}),
			},
		});

		// The callout has v-if="runError" which is null when error text is missing
		expect(queryByRole('alert')).not.toBeInTheDocument();
	});

	it('should prefix error title with provider name when errorDetails.provider is present', () => {
		const { getByText } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'Rate limit exceeded',
						errorDetails: { provider: 'OpenAI' },
					}),
				}),
			},
		});

		// Error title should contain the provider name
		expect(getByText(/OpenAI/)).toBeInTheDocument();
	});

	it('should format technical details as pretty JSON', () => {
		const { container } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'API error',
						errorDetails: {
							technicalDetails: '{"code":429,"message":"rate limited"}',
						},
					}),
				}),
			},
		});

		const pre = container.querySelector('pre');
		expect(pre).toBeTruthy();
		// Pretty-printed JSON should have indentation
		expect(pre?.textContent).toContain('"code": 429');
	});

	it('should show raw technical details when not valid JSON', () => {
		const { container } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'API error',
						errorDetails: {
							technicalDetails: 'plain text error details',
						},
					}),
				}),
			},
		});

		const pre = container.querySelector('pre');
		expect(pre?.textContent).toContain('plain text error details');
	});

	it('should show blinking cursor when streaming with no content and no agentTree', () => {
		const { container } = renderComponent({
			props: {
				message: makeMessage({
					isStreaming: true,
					content: '',
					agentTree: undefined,
				}),
			},
		});

		const cursor = container.querySelector('[class*="blinkingCursor"]');
		expect(cursor).toBeTruthy();
	});

	it('should show status message when streaming with agentTree.statusMessage', () => {
		const { getByText } = renderComponent({
			props: {
				message: makeMessage({
					isStreaming: true,
					content: '',
					agentTree: makeAgentTree({
						status: 'active',
						statusMessage: 'Recalling conversation...',
					}),
				}),
			},
		});

		expect(getByText('Recalling conversation...')).toBeInTheDocument();
	});

	it('should show background task indicator when child has active status and not streaming', () => {
		const { getByText } = renderComponent({
			props: {
				message: makeMessage({
					isStreaming: false,
					agentTree: makeAgentTree({
						status: 'completed',
						children: [makeAgentTree({ agentId: 'child-1', status: 'active' })],
					}),
				}),
			},
		});

		expect(getByText('Working in the background...')).toBeInTheDocument();
	});

	it('should NOT show background task indicator during streaming', () => {
		const { queryByText } = renderComponent({
			props: {
				message: makeMessage({
					isStreaming: true,
					agentTree: makeAgentTree({
						status: 'active',
						children: [makeAgentTree({ agentId: 'child-1', status: 'active' })],
					}),
				}),
			},
		});

		expect(queryByText('Working in the background...')).not.toBeInTheDocument();
	});

	it('should render agent activity tree when agentTree is present', () => {
		const { getByTestId } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree(),
				}),
			},
		});

		expect(getByTestId('agent-activity-tree')).toBeInTheDocument();
	});
});
