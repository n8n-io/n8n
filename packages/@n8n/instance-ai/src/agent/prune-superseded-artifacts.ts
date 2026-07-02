import type { AgentDbMessage, ContentFile, ContentToolCall, MessageContent } from '@n8n/agents';

type ResolvedToolCall = Extract<ContentToolCall, { state: 'resolved' }>;

interface SupersessionRule {
	toolName: string;
	/** Stable artifact key, or undefined when the block isn't a supersedable artifact. */
	artifactKey: (block: ResolvedToolCall) => string | undefined;
}

/** Below this serialized-output size a stub saves nothing; leave the block alone. */
const MIN_PRUNABLE_OUTPUT_CHARS = 1000;

/** File/image blocks in history larger than this are replaced with a text note. */
const MAX_RETAINED_FILE_CHARS = 32_000;

const SUPERSEDED_NOTE =
	'Superseded: a newer version of this artifact appears later in the conversation. Re-fetch with the same tool if the old state is needed.';

function isJsonObject(value: unknown): value is { [key: string]: unknown } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Workflow id when a read file's content is a serialized workflow snapshot. */
function workflowIdFromFileContent(output: unknown): string | undefined {
	if (!isJsonObject(output) || typeof output.content !== 'string') return undefined;
	if (!output.content.trimStart().startsWith('{')) return undefined;
	try {
		const parsed: unknown = JSON.parse(output.content);
		if (isJsonObject(parsed) && typeof parsed.id === 'string' && Array.isArray(parsed.nodes)) {
			return parsed.id;
		}
	} catch {
		return undefined;
	}
	return undefined;
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
		// A later read of the same path supersedes earlier reads of it. Reads of
		// workflow JSON files share the workflows-tool key so the same workflow
		// isn't retained under two representations.
		toolName: 'workspace_read_file',
		artifactKey: (block) => {
			if (!isJsonObject(block.input) || typeof block.input.path !== 'string') return undefined;
			const workflowId = workflowIdFromFileContent(block.output);
			return workflowId === undefined ? `file:${block.input.path}` : `workflow:${workflowId}`;
		},
	},
	{
		// Keep the newest copy of each skill; stub older duplicate loads only.
		// Eval-measured: dropping skills from history entirely regresses
		// multi-turn build quality — the guidance must survive across turns.
		toolName: 'load_skill',
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
 *   (only the newest occurrence per artifact is kept);
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
			const [, key] = match;
			if (latestBlockPerArtifact.get(key) === `${messageIndex}:${blockIndex}`) return block;
			if (JSON.stringify(block.output ?? null).length < MIN_PRUNABLE_OUTPUT_CHARS) return block;
			changed = true;
			return { ...block, output: { superseded: true, artifact: key, note: SUPERSEDED_NOTE } };
		});
		return changed ? { ...message, content } : message;
	});
}
