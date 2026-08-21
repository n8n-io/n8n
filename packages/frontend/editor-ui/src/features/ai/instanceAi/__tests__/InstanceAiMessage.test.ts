import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstanceAiStore } from '../instanceAi.store';
import InstanceAiMessageComponent from '../components/InstanceAiMessage.vue';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';

const { copySpy } = vi.hoisted(function createChatActionMocks() {
	return { copySpy: vi.fn() };
});

vi.mock('@vueuse/core', async function mockVueUse(importOriginal) {
	const original = await importOriginal<typeof import('@vueuse/core')>();
	return {
		...original,
		useClipboard: function useClipboard() {
			return { copy: copySpy };
		},
		useSpeechSynthesis: function useSpeechSynthesis() {
			return {
				isSupported: { value: true },
				isPlaying: { value: false, __v_isRef: true },
				status: { value: 'init' },
				speak: vi.fn(),
				stop: vi.fn(),
			};
		},
	};
});

vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: {
		template: '<span>{{ source.content }}</span>',
		props: ['source'],
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiMessageComponent, {
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
	beforeEach(function setUpPinia() {
		createTestingPinia({ stubActions: false });
		vi.clearAllMocks();
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

	it('should render copy and read-aloud actions for settled assistant text', () => {
		const { getByRole } = renderComponent({
			props: {
				message: makeMessage({ content: 'Copy and read this response' }),
			},
		});

		getByRole('button', { name: 'Copy' }).click();
		expect(copySpy).toHaveBeenCalledWith('Copy and read this response');
		expect(getByRole('button', { name: 'Read aloud' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('should not render message actions for user, empty, or streaming messages', () => {
		const userResult = renderComponent({
			props: {
				message: makeMessage({ role: 'user', content: 'User message' }),
			},
		});
		expect(userResult.queryByRole('group', { name: 'Message actions' })).not.toBeInTheDocument();
		userResult.unmount();

		const emptyResult = renderComponent({
			props: {
				message: makeMessage({ content: '' }),
			},
		});
		expect(emptyResult.queryByRole('group', { name: 'Message actions' })).not.toBeInTheDocument();
		emptyResult.unmount();

		const streamingResult = renderComponent({
			props: {
				message: makeMessage({ content: 'Partial response', isStreaming: true }),
			},
		});
		expect(
			streamingResult.queryByRole('group', { name: 'Message actions' }),
		).not.toBeInTheDocument();
	});

	it('should render the debug toggle as a custom action with pressed state', async () => {
		const store = useInstanceAiStore();
		store.debugMode = true;
		const { getByTestId, getByText } = renderComponent({
			props: {
				message: makeMessage({ content: '' }),
			},
		});

		const button = getByTestId('instance-ai-message-debug');
		expect(button).toHaveAttribute('aria-label', 'Show debug information');
		expect(button).toHaveAttribute('aria-pressed', 'false');

		button.click();
		await vi.waitFor(function waitForDebugState() {
			expect(button).toHaveAttribute('aria-label', 'Hide debug information');
			expect(button).toHaveAttribute('aria-pressed', 'true');
			expect(getByText(/"id": "msg-1"/)).toBeInTheDocument();
		});
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

	it('should render a dedicated out-of-credits message when the error code is quota_exhausted', () => {
		const { getByTestId, getByText, queryByText } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'Have reached end of quota',
						errorDetails: { code: 'quota_exhausted', statusCode: 403 },
					}),
				}),
			},
		});

		expect(getByTestId('instance-ai-out-of-credits')).toBeInTheDocument();
		expect(getByText("You've run out of AI credits")).toBeInTheDocument();
		// Raw provider text and status code are hidden for the tailored state.
		expect(queryByText('Have reached end of quota')).not.toBeInTheDocument();
		expect(queryByText('403')).not.toBeInTheDocument();
	});

	it('should offer an upgrade action in the out-of-credits state', () => {
		const { getByTestId } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'Have reached end of quota',
						errorDetails: { code: 'quota_exhausted' },
					}),
				}),
			},
		});

		expect(getByTestId('instance-ai-out-of-credits-upgrade')).toBeInTheDocument();
	});

	it('should not hide technical details for non-quota errors', () => {
		const { container } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({
						status: 'error',
						error: 'API error',
						errorDetails: { technicalDetails: 'plain text error details' },
					}),
				}),
			},
		});

		expect(container.querySelector('pre')?.textContent).toContain('plain text error details');
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
						statusMessage: 'Processing request...',
					}),
				}),
			},
		});

		expect(getByText('Processing request...')).toBeInTheDocument();
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

	it('should attribute the stop to the user when cancelled by the user', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({ status: 'cancelled', cancellationReason: 'user' }),
				}),
			},
		});

		expect(getByTestId('instance-ai-run-cancelled')).toBeInTheDocument();
		expect(getByText('You stopped this run')).toBeInTheDocument();
	});

	it('should label a timed-out run distinctly', () => {
		const { getByText } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({ status: 'cancelled', cancellationReason: 'timeout' }),
				}),
			},
		});

		expect(getByText('Run timed out')).toBeInTheDocument();
	});

	it('should NOT show the stopped indicator for a completed run', () => {
		const { queryByTestId } = renderComponent({
			props: {
				message: makeMessage({
					agentTree: makeAgentTree({ status: 'completed' }),
				}),
			},
		});

		expect(queryByTestId('instance-ai-run-cancelled')).not.toBeInTheDocument();
	});
});
