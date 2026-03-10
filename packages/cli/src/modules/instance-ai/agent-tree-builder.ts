import { getRenderHint } from '@n8n/api-types';
import type { InstanceAiEvent, InstanceAiAgentNode, InstanceAiTimelineEntry } from '@n8n/api-types';

/**
 * Find an agent node in the tree by agentId (searches root + immediate children).
 * Mirrors the frontend's findAgentNode logic.
 */
export function findAgentNodeInTree(
	tree: InstanceAiAgentNode,
	agentId: string,
): InstanceAiAgentNode | undefined {
	if (tree.agentId === agentId) return tree;
	return tree.children.find((c) => c.agentId === agentId);
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

/**
 * Builds an InstanceAiAgentNode tree from a sequence of events.
 * This mirrors the frontend reducer (instanceAi.reducer.ts) logic exactly,
 * producing the same tree structure that the SSE-connected frontend would build.
 *
 * Used to create snapshots after a run finishes, so that session restore
 * can serve the complete agent tree without replaying all events.
 */
export function buildAgentTreeFromEvents(events: InstanceAiEvent[]): InstanceAiAgentNode {
	// Default tree if we get no events
	let tree: InstanceAiAgentNode = {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
	};

	for (const event of events) {
		switch (event.type) {
			case 'run-start': {
				tree = {
					agentId: event.agentId,
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
				};
				break;
			}

			case 'text-delta': {
				const node = findAgentNodeInTree(tree, event.agentId);
				if (node) {
					node.textContent += event.payload.text;
					appendTimelineText(node.timeline, event.payload.text);
				}
				break;
			}

			case 'reasoning-delta': {
				const node = findAgentNodeInTree(tree, event.agentId);
				if (node) {
					node.reasoning += event.payload.text;
				}
				break;
			}

			case 'tool-call': {
				const node = findAgentNodeInTree(tree, event.agentId);
				if (node) {
					node.toolCalls.push({
						toolCallId: event.payload.toolCallId,
						toolName: event.payload.toolName,
						args: event.payload.args,
						isLoading: true,
						renderHint: getRenderHint(event.payload.toolName),
					});
					node.timeline.push({ type: 'tool-call', toolCallId: event.payload.toolCallId });
				}
				break;
			}

			case 'tool-result': {
				const node = findAgentNodeInTree(tree, event.agentId);
				const tc = node?.toolCalls.find((t) => t.toolCallId === event.payload.toolCallId);
				if (tc) {
					tc.result = event.payload.result;
					tc.isLoading = false;
				}
				break;
			}

			case 'tool-error': {
				const node = findAgentNodeInTree(tree, event.agentId);
				const tc = node?.toolCalls.find((t) => t.toolCallId === event.payload.toolCallId);
				if (tc) {
					tc.error = event.payload.error;
					tc.isLoading = false;
				}
				break;
			}

			case 'agent-spawned': {
				const parent = findAgentNodeInTree(tree, event.payload.parentId);
				if (parent) {
					parent.children.push({
						agentId: event.agentId,
						role: event.payload.role,
						tools: event.payload.tools,
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					});
					parent.timeline.push({ type: 'child', agentId: event.agentId });
				}
				break;
			}

			case 'agent-completed': {
				const node = findAgentNodeInTree(tree, event.agentId);
				if (node) {
					node.status = event.payload.error ? 'error' : 'completed';
					node.result = event.payload.result;
					node.error = event.payload.error;
				}
				break;
			}

			case 'confirmation-request': {
				const node = findAgentNodeInTree(tree, event.agentId);
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
				break;
			}

			case 'plan-update': {
				const node = findAgentNodeInTree(tree, event.agentId);
				if (node) {
					node.plan = event.payload.plan;
				}
				break;
			}

			case 'error': {
				const node = findAgentNodeInTree(tree, event.agentId);
				if (node) {
					const errorText = '\n\n*Error: ' + event.payload.content + '*';
					node.textContent += errorText;
					appendTimelineText(node.timeline, errorText);
				}
				break;
			}

			case 'run-finish': {
				const { status } = event.payload;
				tree.status =
					status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'error';
				break;
			}
		}
	}

	return tree;
}
