import {
	TOOL_INPUT_PROGRESS_MAX_NODE_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	type InstanceAiToolInputProgressPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** Tools whose arguments carry workflow source while they stream. */
const SOURCE_TOOLS = new Set<string>([
	'workspace_write_file',
	'workspace_str_replace_file',
	WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
]);

const REPORT_INTERVAL_MS = 2000;
/** Enough for a large workflow source. Later input is not read. */
const MAX_BUFFER_LENGTH = 512 * 1024;
// The SDK names a node in its config: `config: { name: 'Fetch Data', ... }`.
const NODE_NAME_PATTERN = /config:\s*\{\s*name:\s*(['"`])((?:(?!\1)[^\n\\]){1,200})\1/g;

interface TrackedCall {
	buffer: string;
	reportedAt: number;
	nodeNames: string[];
}

/** The partial arguments are JSON, so the source in them is escaped. */
function unescapeJsonText(text: string): string {
	return text.replace(/\\(.)/g, (_, char: string) => {
		if (char === 'n') return '\n';
		if (char === 't') return '\t';
		return char;
	});
}

function findNodeNames(escapedSource: string): string[] {
	const names = [...unescapeJsonText(escapedSource).matchAll(NODE_NAME_PATTERN)].map(
		(match) => match[2],
	);
	return names.slice(0, TOOL_INPUT_PROGRESS_MAX_NODE_NAMES);
}

function sameNames(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((name, index) => name === b[index]);
}

/**
 * Follows the streaming arguments of the tools that write workflow source, and
 * reports the node names written so far. The user sees the agent move from
 * node to node during a long write, instead of one static label.
 */
export class ToolInputProgressTracker {
	private readonly calls = new Map<string, TrackedCall>();

	/** The progress to publish for this chunk, at most once every 2 seconds for each call. */
	observe(chunk: unknown, now: number): InstanceAiToolInputProgressPayload | undefined {
		if (!isRecord(chunk) || typeof chunk.toolCallId !== 'string') return undefined;
		const { toolCallId } = chunk;

		if (chunk.type === 'tool-input-start') {
			if (typeof chunk.toolName === 'string' && SOURCE_TOOLS.has(chunk.toolName)) {
				this.calls.set(toolCallId, { buffer: '', reportedAt: -Infinity, nodeNames: [] });
			}
			return undefined;
		}
		if (chunk.type === 'tool-call') {
			this.calls.delete(toolCallId);
			return undefined;
		}
		if (chunk.type !== 'tool-input-delta' || typeof chunk.delta !== 'string') return undefined;

		const call = this.calls.get(toolCallId);
		if (!call) return undefined;
		if (call.buffer.length < MAX_BUFFER_LENGTH) call.buffer += chunk.delta;
		if (now - call.reportedAt < REPORT_INTERVAL_MS) return undefined;

		const nodeNames = findNodeNames(call.buffer);
		if (nodeNames.length === 0 || sameNames(nodeNames, call.nodeNames)) return undefined;
		call.reportedAt = now;
		call.nodeNames = nodeNames;
		return { toolCallId, nodeNames };
	}
}
