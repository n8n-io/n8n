import { getRenderHint } from '@n8n/api-types';
import type {
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
} from '@n8n/api-types';

export interface InstanceAiReducerState {
	messages: InstanceAiMessage[];
	activeRunId: string | null;
}

export function findMessageByRunId(
	state: InstanceAiReducerState,
	runId: string,
): InstanceAiMessage | undefined {
	return state.messages.find((m) => m.runId === runId);
}

export function findAgentNode(
	msg: InstanceAiMessage | undefined,
	agentId: string,
): InstanceAiAgentNode | undefined {
	if (!msg?.agentTree) return undefined;
	if (msg.agentTree.agentId === agentId) return msg.agentTree;
	return msg.agentTree.children.find((c) => c.agentId === agentId);
}

/** Append text to the timeline — merges with the last entry if it's also text. */
function appendTimelineText(timeline: InstanceAiTimelineEntry[], text: string): void {
	const last = timeline.at(-1);
	if (last?.type === 'text') {
		last.content += text;
	} else {
		timeline.push({ type: 'text', content: text });
	}
}

// getRenderHint is now imported from @n8n/api-types and re-exported for backward compat
export { getRenderHint };

/** Mutates state.messages in-place. Returns the new activeRunId (may differ from input). */
export function handleEvent(state: InstanceAiReducerState, event: InstanceAiEvent): string | null {
	// Mid-run replay guard: if we receive events for a runId that has no
	// message yet (e.g., reconnect missed the run-start), create the message
	// on the fly so subsequent events aren't dropped.
	if (event.type !== 'run-start' && !findMessageByRunId(state, event.runId)) {
		const rootAgentId = event.type === 'agent-spawned' ? event.payload.parentId : event.agentId;
		state.messages.push({
			id: event.runId,
			runId: event.runId,
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: true,
			agentTree: {
				agentId: rootAgentId,
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			},
		});
	}

	switch (event.type) {
		case 'run-start': {
			state.messages.push({
				id: event.runId,
				runId: event.runId,
				role: 'assistant',
				createdAt: new Date().toISOString(),
				content: '',
				reasoning: '',
				isStreaming: true,
				agentTree: {
					agentId: event.agentId,
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
				},
			});
			return event.runId;
		}

		case 'text-delta': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			if (node) {
				node.textContent += event.payload.text;
				appendTimelineText(node.timeline, event.payload.text);
			}
			// Also accumulate on the message level for simple rendering
			if (msg?.agentTree && event.agentId === msg.agentTree.agentId) {
				msg.content += event.payload.text;
			}
			return state.activeRunId;
		}

		case 'reasoning-delta': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			if (node) node.reasoning += event.payload.text;
			if (msg?.agentTree && event.agentId === msg.agentTree.agentId) {
				msg.reasoning += event.payload.text;
			}
			return state.activeRunId;
		}

		case 'tool-call': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			if (node) {
				node.toolCalls.push({
					toolCallId: event.payload.toolCallId,
					toolName: event.payload.toolName,
					args: event.payload.args,
					isLoading: true,
					renderHint: getRenderHint(event.payload.toolName),
					startedAt: new Date().toISOString(),
				});
				node.timeline.push({ type: 'tool-call', toolCallId: event.payload.toolCallId });
			}
			return state.activeRunId;
		}

		case 'tool-result': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			const tc = node?.toolCalls.find((t) => t.toolCallId === event.payload.toolCallId);
			if (tc) {
				tc.result = event.payload.result;
				tc.isLoading = false;
				tc.completedAt = new Date().toISOString();
			}
			return state.activeRunId;
		}

		case 'tool-error': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			const tc = node?.toolCalls.find((t) => t.toolCallId === event.payload.toolCallId);
			if (tc) {
				tc.error = event.payload.error;
				tc.isLoading = false;
				tc.completedAt = new Date().toISOString();
			}
			return state.activeRunId;
		}

		case 'agent-spawned': {
			const msg = findMessageByRunId(state, event.runId);
			const parent = findAgentNode(msg, event.payload.parentId);
			if (parent) {
				parent.children.push({
					agentId: event.agentId,
					role: event.payload.role,
					tools: event.payload.tools,
					taskId: event.payload.taskId,
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
				});
				parent.timeline.push({ type: 'child', agentId: event.agentId });
			}
			return state.activeRunId;
		}

		case 'agent-completed': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			if (node) {
				node.status = event.payload.error ? 'error' : 'completed';
				node.result = event.payload.result;
				node.error = event.payload.error;
			}
			return state.activeRunId;
		}

		case 'confirmation-request': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			const tc = node?.toolCalls.find((t) => t.toolCallId === event.payload.toolCallId);
			if (tc) {
				tc.confirmation = {
					requestId: event.payload.requestId,
					severity: event.payload.severity,
					message: event.payload.message,
					credentialRequests: event.payload.credentialRequests,
					inputType: event.payload.inputType,
				};
			}
			return state.activeRunId;
		}

		case 'plan-update': {
			const msg = findMessageByRunId(state, event.runId);
			const node = findAgentNode(msg, event.agentId);
			if (node) node.plan = event.payload.plan;
			return state.activeRunId;
		}

		case 'error': {
			const msg = findMessageByRunId(state, event.runId);
			if (msg) {
				const errorText = '\n\n*Error: ' + event.payload.content + '*';
				const node = findAgentNode(msg, event.agentId);
				if (node) {
					node.textContent += errorText;
					appendTimelineText(node.timeline, errorText);
				} else if (msg.agentTree) {
					msg.agentTree.textContent += errorText;
					appendTimelineText(msg.agentTree.timeline, errorText);
				} else {
					msg.content += errorText;
				}
			}
			return state.activeRunId;
		}

		case 'filesystem-request': {
			// Handled by the browser composable, not the reducer — no state change
			return state.activeRunId;
		}

		case 'run-finish': {
			const msg = findMessageByRunId(state, event.runId);
			if (msg) {
				msg.isStreaming = false;
				if (msg.agentTree) {
					const { status } = event.payload;
					msg.agentTree.status =
						status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'error';
				}
			}
			return null;
		}

		default:
			return state.activeRunId;
	}
}
