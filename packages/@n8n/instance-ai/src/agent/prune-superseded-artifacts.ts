import type { AgentDbMessage, ContentFile, ContentToolCall, MessageContent } from '@n8n/agents';

type ResolvedToolCall = Extract<ContentToolCall, { state: 'resolved' }>;

interface SupersessionRule {
	toolName: string;
	/**
	 * 'latest' keeps the newest occurrence per artifact and stubs older ones;
	 * 'none' stubs every history occurrence (the turn that fetched it already
	 * consumed the content, and the stub says how to re-fetch).
	 */
	retain: 'latest' | 'none';
	/** Stable artifact key, or undefined when the block isn't a supersedable artifact. */
	artifactKey: (block: ResolvedToolCall) => string | undefined;
}

/** Below this serialized-output size a stub saves nothing; leave the block alone. */
const MIN_PRUNABLE_OUTPUT_CHARS = 1000;

/** File/image blocks in history larger than this are replaced with a text note. */
const MAX_RETAINED_FILE_CHARS = 32_000;

const SUPERSEDED_NOTE =
	'Superseded: a newer version of this artifact appears later in the conversation. Re-fetch with the same tool if the old state is needed.';

const CONSUMED_NOTE =
	'Pruned from context to save tokens. Re-fetch with the same tool if the content is needed again.';

function isJsonObject(value: unknown): value is { [key: string]: unknown } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const RULES: SupersessionRule[] = [
	{
		// Full workflow snapshots (get-json / get-version / get-as-code / mutation echoes).
		toolName: 'workflows',
		retain: 'latest',
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
		retain: 'latest',
		artifactKey: (block) =>
			isJsonObject(block.input) && typeof block.input.path === 'string'
				? `file:${block.input.path}`
				: undefined,
	},
	{
		// Skill instructions are consumed in the turn that loaded them; later
		// turns get a stub and can re-load on demand instead of carrying ~16k
		// tokens of skill text on every LLM call.
		toolName: 'load_skill',
		retain: 'none',
		artifactKey: (block) => {
			const output = block.output;
			if (!isJsonObject(output) || typeof output.skillId !== 'string') return undefined;
			const filePath = typeof output.filePath === 'string' ? `:${output.filePath}` : '';
			return `skill:${output.skillId}${filePath}`;
		},
	},
];

const ruleByTool = new Map(RULES.map((rule) => [rule.toolName, rule]));

function artifactKeyOf(block: MessageContent): [SupersessionRule, string] | undefined {
	if (block.type !== 'tool-call' || block.state !== 'resolved') return undefined;
	const rule = ruleByTool.get(block.toolName);
	const key = rule?.artifactKey(block);
	return rule && key !== undefined ? [rule, key] : undefined;
}

function fileDataChars(data: ContentFile['data']): number {
	if (typeof data === 'string') return data.length;
	if (data instanceof Uint8Array) return data.byteLength;
	if (data instanceof ArrayBuffer) return data.byteLength;
	return 0;
}

/**
 * Shrink stale artifact payloads in thread history:
 * - tool results covered by a supersession rule are replaced with a small stub
 *   (keeping the newest occurrence per artifact for 'latest' rules);
 * - large inline file/image blocks are replaced with a text note (their content
 *   was seen in the turn they arrived in).
 * Large tool results (full workflow JSON, file reads, skill text) dominate the
 * orchestrator prompt and are re-billed on every LLM call; only the newest
 * state is actionable.
 *
 * Pure and non-destructive: operates on the in-memory prompt view loaded at
 * turn start (persisted messages are untouched), so the pruned view is stable
 * for the whole turn and across HITL resumes — the cache prefix never mutates
 * mid-loop. Current-turn messages never pass through this transform.
 */
export function pruneSupersededArtifacts(messages: AgentDbMessage[]): AgentDbMessage[] {
	const latestBlockPerArtifact = new Map<string, string>();
	let hasLargeFileBlock = false;
	messages.forEach((message, messageIndex) => {
		if (message.type === 'custom') return;
		message.content.forEach((block, blockIndex) => {
			const match = artifactKeyOf(block);
			if (match) latestBlockPerArtifact.set(match[1], `${messageIndex}:${blockIndex}`);
			if (block.type === 'file' && fileDataChars(block.data) > MAX_RETAINED_FILE_CHARS) {
				hasLargeFileBlock = true;
			}
		});
	});
	if (latestBlockPerArtifact.size === 0 && !hasLargeFileBlock) return messages;

	return messages.map((message, messageIndex) => {
		if (message.type === 'custom') return message;
		let changed = false;
		const content = message.content.map((block, blockIndex): MessageContent => {
			if (block.type === 'file') {
				const size = fileDataChars(block.data);
				if (size <= MAX_RETAINED_FILE_CHARS) return block;
				changed = true;
				return {
					type: 'text',
					text: `[Attachment content removed from older context (${block.mediaType ?? 'file'}, ~${Math.round(size / 1024)}KB). Ask the user to re-attach it or use the parse-file tool if it is needed again.]`,
				};
			}
			if (block.type !== 'tool-call' || block.state !== 'resolved') return block;
			const match = artifactKeyOf(block);
			if (!match) return block;
			const [rule, key] = match;
			if (
				rule.retain === 'latest' &&
				latestBlockPerArtifact.get(key) === `${messageIndex}:${blockIndex}`
			) {
				return block;
			}
			if (JSON.stringify(block.output ?? null).length < MIN_PRUNABLE_OUTPUT_CHARS) return block;
			changed = true;
			const note = rule.retain === 'latest' ? SUPERSEDED_NOTE : CONSUMED_NOTE;
			return { ...block, output: { superseded: true, artifact: key, note } };
		});
		return changed ? { ...message, content } : message;
	});
}
