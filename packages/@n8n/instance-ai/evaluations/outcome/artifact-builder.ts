// ---------------------------------------------------------------------------
// Artifact builder: render verification artifacts from messages and outcomes
// ---------------------------------------------------------------------------

import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import type { AgentOutcome, ChatEntry, ChatMessage } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOOL_RESULT_CHARS = 3000;

// ---------------------------------------------------------------------------
// buildVerificationArtifactFromMessages
//
// Builds the verification artifact from the rich messages endpoint response
// instead of raw SSE events. This provides full tool call results (web search
// content, fetched pages) and avoids cross-run workflow attribution.
// ---------------------------------------------------------------------------

export function buildVerificationArtifactFromMessages(
	messages: InstanceAiMessage[],
	outcome: AgentOutcome,
): string {
	const sections: string[] = [];

	// 1. Render chat conversation (user messages + assistant agent trees)
	const conversationParts: string[] = [];
	for (const message of messages) {
		if (message.role === 'user') {
			conversationParts.push(`**User:** ${message.content}`);
		} else if (message.role === 'assistant' && message.agentTree) {
			conversationParts.push(renderAgentNode(message.agentTree, 0));
		} else if (message.role === 'assistant' && message.content) {
			conversationParts.push(`**Assistant:** ${message.content}`);
		}
	}
	if (conversationParts.length > 0) {
		sections.push(formatSection('Chat Conversation', conversationParts.join('\n\n')));
	}

	// 2. Outcome sections (workflows, executions, data tables)
	if (outcome.workflowsCreated.length > 0) {
		const workflowLines = outcome.workflowsCreated.map((wf) =>
			[
				`- Workflow "${wf.name}" (ID: ${wf.id})`,
				`  Nodes: ${String(wf.nodeCount)}`,
				`  Active: ${String(wf.active)}`,
			].join('\n'),
		);
		sections.push(formatSection('Created Workflows', workflowLines.join('\n\n')));
	}

	if (outcome.executionsRun.length > 0) {
		const execLines = outcome.executionsRun.map((exec) => {
			const parts = [
				`- Execution ${exec.id || '(eval-triggered)'} (workflow: ${exec.workflowId}) — Status: ${exec.status}`,
			];
			if (exec.triggeredByEval) parts.push('  Triggered by: eval runner (post-build)');
			if (exec.error) parts.push(`  Error: ${exec.error}`);
			if (exec.failedNode) parts.push(`  Failed node: ${exec.failedNode}`);
			if (exec.webhookResponse) {
				parts.push(`  Webhook HTTP response: ${String(exec.webhookResponse.status)}`);
				const bodyStr =
					typeof exec.webhookResponse.body === 'string'
						? exec.webhookResponse.body
						: JSON.stringify(exec.webhookResponse.body, null, 2);
				parts.push(`  Response body:\n  \`\`\`json\n${bodyStr}\n  \`\`\``);
			}
			if (exec.outputData && exec.outputData.length > 0) {
				for (const nodeOutput of exec.outputData) {
					parts.push(`  Node "${nodeOutput.nodeName}" output:`);
					parts.push(`  \`\`\`json\n${JSON.stringify(nodeOutput.data, null, 2)}\n  \`\`\``);
				}
			}
			return parts.join('\n');
		});
		sections.push(formatSection('Execution Results', execLines.join('\n\n')));
	}

	if (outcome.dataTablesCreated.length > 0) {
		const tableLines = outcome.dataTablesCreated.map((id) => `- Data table ID: ${id}`);
		sections.push(formatSection('Data Tables Created', tableLines.join('\n')));
	}

	return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// extractChatMessages
//
// Flattens rich messages into a simple ChatMessage[] for report rendering.
// Walks the agent tree to collect all tool calls with results.
// ---------------------------------------------------------------------------

export function extractChatMessages(messages: InstanceAiMessage[]): ChatMessage[] {
	const result: ChatMessage[] = [];

	for (const message of messages) {
		if (message.role === 'user') {
			result.push({ role: 'user', entries: [{ type: 'text', content: message.content }] });
		} else if (message.role === 'assistant') {
			const entries: ChatEntry[] = [];
			if (message.agentTree) {
				collectTimelineEntries(message.agentTree, entries);
			} else if (message.content) {
				entries.push({ type: 'text', content: message.content });
			}
			result.push({ role: 'assistant', entries });
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function collectTimelineEntries(node: InstanceAiAgentNode, out: ChatEntry[]): void {
	if (node.timeline.length > 0) {
		for (const entry of node.timeline) {
			switch (entry.type) {
				case 'text':
					out.push({ type: 'text', content: entry.content });
					break;
				case 'tool-call': {
					const tc = node.toolCalls.find((t) => t.toolCallId === entry.toolCallId);
					if (tc) {
						out.push({
							type: 'tool-call',
							toolCall: {
								toolName: tc.toolName,
								args: tc.args,
								result: tc.result,
								error: tc.error,
							},
						});
					}
					break;
				}
				case 'child': {
					const child = node.children.find((c) => c.agentId === entry.agentId);
					if (child) {
						collectTimelineEntries(child, out);
					}
					break;
				}
			}
		}
	} else {
		// Fallback: text then tool calls then children
		if (node.textContent) {
			out.push({ type: 'text', content: node.textContent });
		}
		for (const tc of node.toolCalls) {
			out.push({
				type: 'tool-call',
				toolCall: { toolName: tc.toolName, args: tc.args, result: tc.result, error: tc.error },
			});
		}
		for (const child of node.children) {
			collectTimelineEntries(child, out);
		}
	}
}

function renderAgentNode(node: InstanceAiAgentNode, depth: number): string {
	const indent = '  '.repeat(depth);
	const lines: string[] = [];

	// Agent header
	const roleParts = [node.role];
	if (node.kind) roleParts.push(`(${node.kind})`);
	if (node.title) roleParts.push(`— ${node.title}`);
	lines.push(`${indent}**Agent [${roleParts.join(' ')}]** (status: ${node.status})`);

	// Target resource
	if (node.targetResource?.id) {
		const resName = node.targetResource.name ? ` "${node.targetResource.name}"` : '';
		lines.push(
			`${indent}Resource: ${node.targetResource.type}${resName} (ID: ${node.targetResource.id})`,
		);
	}

	// Render content using timeline if available, otherwise fallback
	if (node.timeline.length > 0) {
		for (const entry of node.timeline) {
			switch (entry.type) {
				case 'text':
					lines.push(`${indent}${entry.content}`);
					break;
				case 'tool-call': {
					const tc = node.toolCalls.find((t) => t.toolCallId === entry.toolCallId);
					if (tc) {
						lines.push(renderToolCallState(tc, indent));
					}
					break;
				}
				case 'child': {
					const child = node.children.find((c) => c.agentId === entry.agentId);
					if (child) {
						lines.push(renderAgentNode(child, depth + 1));
					}
					break;
				}
			}
		}
	} else {
		// Fallback: render text content + all tool calls
		if (node.textContent) {
			lines.push(`${indent}${node.textContent}`);
		}
		for (const tc of node.toolCalls) {
			lines.push(renderToolCallState(tc, indent));
		}
		for (const child of node.children) {
			lines.push(renderAgentNode(child, depth + 1));
		}
	}

	return lines.join('\n');
}

function renderToolCallState(tc: InstanceAiToolCallState, indent: string): string {
	const lines: string[] = [];
	lines.push(`${indent}**Tool: ${tc.toolName}**`);

	const argsStr = JSON.stringify(tc.args, null, 2);
	if (argsStr !== '{}') {
		lines.push(`${indent}Args:\n${indent}\`\`\`json\n${argsStr}\n${indent}\`\`\``);
	}

	if (tc.error) {
		lines.push(`${indent}Error: ${tc.error}`);
	} else if (tc.result !== undefined) {
		const resultStr =
			typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2);
		const truncated =
			resultStr.length > MAX_TOOL_RESULT_CHARS
				? resultStr.slice(0, MAX_TOOL_RESULT_CHARS) + '\n... (truncated)'
				: resultStr;
		lines.push(`${indent}Result:\n${indent}\`\`\`\n${truncated}\n${indent}\`\`\``);
	}

	return lines.join('\n');
}

function formatSection(title: string, content: string): string {
	return `### ${title}\n\n${content}`;
}
