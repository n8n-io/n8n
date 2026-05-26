import { Agent, type AgentMessage, type ModelConfig as NativeModelConfig } from '@n8n/agents';

import type { ModelConfig } from '../types';

const COMPACTION_SYSTEM_PROMPT = `You are a conversation summarizer for an AI assistant embedded in n8n (a workflow automation platform).

Given a previous summary (if any) and a batch of new conversation turns, produce an updated rolling summary.

## Output format

Return exactly five sections with these headers, no other text:

### Goal
The user's primary objective in this conversation.

### Important facts and decisions
Key facts, user preferences, credential names, workflow IDs, and decisions made. Bullet list.

### Current workflow/build state
What workflows exist, their status (draft/active/tested), last build outcome, any verification results. If no workflow work has happened, write "No workflow activity yet."

### Open issues or blockers
Unresolved errors, missing credentials, failed verifications, or pending user decisions. If none, write "None."

### Likely next step
What the assistant should do next based on the conversation so far.

## Rules

- Be concise. Each section should be 1-5 bullet points maximum.
- Preserve all workflow IDs, credential names, node names, and error messages exactly.
- Drop verbose tool payloads, binary data references, and raw execution outputs — keep only the outcome.
- When merging with a previous summary, update sections rather than appending duplicates.
- If a decision was reversed or an issue was resolved, reflect the current state, not the history.`;

export interface CompactionInput {
	previousSummary: string | null;
	messageBatch: Array<{ role: string; text: string }>;
}

function extractAssistantText(messages: AgentMessage[]): string {
	return messages
		.filter((message) => 'role' in message && message.role === 'assistant')
		.flatMap((message) => ('content' in message ? message.content : []))
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');
}

function toNativeModelConfig(modelId: ModelConfig): NativeModelConfig {
	if (typeof modelId === 'string') return modelId;

	if ('id' in modelId && typeof modelId.id === 'string') {
		const nativeConfig: Extract<NativeModelConfig, { id: string }> = { id: modelId.id };
		if (modelId.apiKey !== undefined) nativeConfig.apiKey = modelId.apiKey;
		if (modelId.url !== undefined) nativeConfig.url = modelId.url;
		if (modelId.headers !== undefined) nativeConfig.headers = modelId.headers;
		return nativeConfig;
	}

	throw new Error('Native compaction requires a native agents model config');
}

/**
 * Generate a compacted summary from a previous summary and a batch of messages.
 * Uses a lightweight native Agent with no tools and no memory.
 */
export async function generateCompactionSummary(
	modelId: ModelConfig,
	input: CompactionInput,
): Promise<string> {
	const agent = new Agent('Compaction Summarizer')
		.model(toNativeModelConfig(modelId))
		.instructions(COMPACTION_SYSTEM_PROMPT);

	const parts: string[] = [];

	if (input.previousSummary) {
		parts.push(`<previous-summary>\n${input.previousSummary}\n</previous-summary>`);
	}

	parts.push('<new-turns>');
	for (const msg of input.messageBatch) {
		parts.push(`[${msg.role}]: ${msg.text}`);
	}
	parts.push('</new-turns>');

	parts.push('Produce the updated summary now. Return only the five sections, nothing else.');

	const result = await agent.generate(parts.join('\n\n'), { maxIterations: 1 });
	return extractAssistantText(result.messages);
}
