import type { AgentDbMessage, ContentToolCall, MessageContent } from '@n8n/agents';

type ResolvedToolCall = Extract<ContentToolCall, { state: 'resolved' }>;

interface SupersessionRule {
	toolName: string;
	/** Stable artifact key, or undefined when the block isn't a supersedable artifact. */
	artifactKey: (block: ResolvedToolCall) => string | undefined;
}

/** Below this serialized-output size a stub saves nothing; leave the block alone. */
const MIN_PRUNABLE_OUTPUT_CHARS = 1000;

const SUPERSEDED_NOTE =
	'Superseded: a newer version of this artifact appears later in the conversation. Re-fetch with the same tool if the old state is needed.';

function isJsonObject(value: unknown): value is { [key: string]: unknown } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const RULES: SupersessionRule[] = [
	{
		// Full workflow snapshots (get-json / get-version / get-as-code / mutation echoes).
		toolName: 'workflows',
		artifactKey: (block) => {
			const output = block.output;
			if (!isJsonObject(output)) return undefined;
			if (!Array.isArray(output.nodes) && typeof output.code !== 'string') return undefined;
			const id =
				typeof output.workflowId === 'string'
					? output.workflowId
					: typeof output.id === 'string'
						? output.id
						: undefined;
			return id === undefined ? undefined : `workflow:${id}`;
		},
	},
	{
		// A later read of the same path supersedes earlier reads of it.
		toolName: 'workspace_read_file',
		artifactKey: (block) =>
			isJsonObject(block.input) && typeof block.input.path === 'string'
				? `file:${block.input.path}`
				: undefined,
	},
];

const ruleByTool = new Map(RULES.map((rule) => [rule.toolName, rule]));

function artifactKeyOf(block: MessageContent): string | undefined {
	if (block.type !== 'tool-call' || block.state !== 'resolved') return undefined;
	return ruleByTool.get(block.toolName)?.artifactKey(block);
}

/**
 * Replace stale artifact snapshots in thread history with a small stub,
 * keeping only the latest occurrence per artifact. Large tool results
 * (full workflow JSON, file reads) dominate the orchestrator prompt and are
 * re-billed on every LLM call; only the newest state is actionable.
 *
 * Pure and non-destructive: operates on the in-memory prompt view loaded at
 * turn start (persisted messages are untouched), so the pruned view is stable
 * for the whole turn and across HITL resumes — the cache prefix never mutates
 * mid-loop. Current-turn messages never pass through this transform.
 */
export function pruneSupersededArtifacts(messages: AgentDbMessage[]): AgentDbMessage[] {
	const latestBlockPerArtifact = new Map<string, string>();
	messages.forEach((message, messageIndex) => {
		if (message.type === 'custom') return;
		message.content.forEach((block, blockIndex) => {
			const key = artifactKeyOf(block);
			if (key !== undefined) latestBlockPerArtifact.set(key, `${messageIndex}:${blockIndex}`);
		});
	});
	if (latestBlockPerArtifact.size === 0) return messages;

	return messages.map((message, messageIndex) => {
		if (message.type === 'custom') return message;
		let changed = false;
		const content = message.content.map((block, blockIndex): MessageContent => {
			if (block.type !== 'tool-call' || block.state !== 'resolved') return block;
			const key = artifactKeyOf(block);
			if (key === undefined) return block;
			if (latestBlockPerArtifact.get(key) === `${messageIndex}:${blockIndex}`) return block;
			if (JSON.stringify(block.output ?? null).length < MIN_PRUNABLE_OUTPUT_CHARS) return block;
			changed = true;
			return { ...block, output: { superseded: true, artifact: key, note: SUPERSEDED_NOTE } };
		});
		return changed ? { ...message, content } : message;
	});
}
