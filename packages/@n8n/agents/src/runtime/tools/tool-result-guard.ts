import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { AgentMessage, MessageContent } from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';
import {
	storeToolResult,
	type ToolResultKind,
	type ToolResultStorageScope,
} from '../../workspace/tool-result-storage';
import type { WorkspaceFilesystem } from '../../workspace/types';
import { estimateObservationTokens, type TokenCounter } from '../model/model-token-counter';

export const MAX_MODEL_TOOL_RESULT_TOKENS = 50_000;
// BPE tokens cannot exceed UTF-8 bytes; reserve room for provider message framing.
const SMALL_PAYLOAD_OVERHEAD_BYTES = 1_024;

interface TruncatedToolResult extends JSONObject {
	_truncated: true;
	originalCharCount: number;
	estimatedTokenCount: number;
	head: string;
	tail: string;
}

interface OffloadedToolResult extends JSONObject {
	_offloaded: true;
	path: string;
	originalCharCount: number;
	estimatedTokenCount: number;
	requiredAction: {
		toolName: 'workspace_read_tool_result';
		input: {
			path: string;
			view: 'describe';
		};
	};
	message: string;
}

export interface ToolResultGuardStorage extends ToolResultStorageScope {
	filesystem: WorkspaceFilesystem;
}

export interface GuardedToolResult {
	historyOutput: JSONValue;
	wireOutput: unknown;
	truncated: boolean;
	offloaded: boolean;
}

export async function guardToolResultForModel(
	output: unknown,
	tokenCounter: TokenCounter = estimateObservationTokens,
	storage?: ToolResultGuardStorage,
	kind: ToolResultKind = 'result',
): Promise<GuardedToolResult> {
	const historyOutput = toJsonValue(output);
	const serialized = JSON.stringify(historyOutput);

	if (isClearlyWithinTokenLimit(serialized)) {
		return { historyOutput, wireOutput: output, truncated: false, offloaded: false };
	}

	const tokenCount = await tokenCounter(serialized);
	if (tokenCount <= MAX_MODEL_TOOL_RESULT_TOKENS) {
		return { historyOutput, wireOutput: output, truncated: false, offloaded: false };
	}

	const offloaded = await tryOffloadResult(serialized, tokenCount, kind, storage);
	if (offloaded) {
		return {
			historyOutput: offloaded,
			wireOutput: offloaded,
			truncated: false,
			offloaded: true,
		};
	}

	const truncated = await buildTruncationEnvelope(serialized, tokenCount, tokenCounter);
	return {
		historyOutput: truncated,
		wireOutput: truncated,
		truncated: true,
		offloaded: false,
	};
}

export async function guardToolErrorForModel(
	errorText: string,
	tokenCounter: TokenCounter = estimateObservationTokens,
	storage?: ToolResultGuardStorage,
): Promise<string> {
	const guarded = await guardToolResultForModel(errorText, tokenCounter, storage, 'error');
	return guarded.truncated || guarded.offloaded ? JSON.stringify(guarded.historyOutput) : errorText;
}

export async function guardToolMessageForModel(
	message: AgentMessage,
	tokenCounter: TokenCounter = estimateObservationTokens,
	storage?: ToolResultGuardStorage,
): Promise<AgentMessage> {
	if (!('content' in message)) return message;

	const textBlocks = message.content.filter((block) => block.type === 'text');
	if (textBlocks.length === 0) return message;

	const guarded = await guardToolResultForModel(textBlocks, tokenCounter, storage, 'message');
	if (!guarded.truncated && !guarded.offloaded) return message;

	const replacement = JSON.stringify(guarded.historyOutput);
	let replacedText = false;
	const content = message.content.flatMap((block): MessageContent[] => {
		if (block.type !== 'text') return [block];
		if (replacedText) return [];

		replacedText = true;
		return [{ ...block, text: replacement }];
	});

	return { ...message, content };
}

async function tryOffloadResult(
	serialized: string,
	tokenCount: number,
	kind: ToolResultKind,
	storage?: ToolResultGuardStorage,
): Promise<OffloadedToolResult | undefined> {
	if (!storage || storage.filesystem.readOnly === true) return undefined;

	try {
		const path = await storeToolResult(storage.filesystem, storage, kind, serialized);
		return {
			_offloaded: true,
			path,
			originalCharCount: serialized.length,
			estimatedTokenCount: tokenCount,
			requiredAction: {
				toolName: 'workspace_read_tool_result',
				input: { path, view: 'describe' },
			},
			message:
				'The complete tool result was stored in the workspace. Follow requiredAction before answering, then keep using workspace_read_tool_result with relevant JSON Pointers and nextOffset pages until you have enough evidence. Do not assume the first page is complete when hasMore is true.',
		};
	} catch {
		return undefined;
	}
}

function isClearlyWithinTokenLimit(serialized: string): boolean {
	return (
		Buffer.byteLength(serialized, 'utf8') + SMALL_PAYLOAD_OVERHEAD_BYTES <=
		MAX_MODEL_TOOL_RESULT_TOKENS
	);
}

async function buildTruncationEnvelope(
	serialized: string,
	originalTokenCount: number,
	tokenCounter: TokenCounter,
): Promise<TruncatedToolResult> {
	const base = {
		_truncated: true,
		originalCharCount: serialized.length,
		estimatedTokenCount: originalTokenCount,
	} as const;
	let excerptLength = Math.floor(
		(serialized.length * MAX_MODEL_TOOL_RESULT_TOKENS * 0.9) / originalTokenCount,
	);

	while (true) {
		const { head, tail } = splitHeadAndTail(serialized, excerptLength);
		const candidate: TruncatedToolResult = { ...base, head, tail };
		const candidateTokenCount = await tokenCounter(JSON.stringify(candidate));
		if (candidateTokenCount <= MAX_MODEL_TOOL_RESULT_TOKENS || excerptLength === 0) {
			return candidate;
		}

		excerptLength = Math.min(
			excerptLength - 1,
			Math.floor((excerptLength * MAX_MODEL_TOOL_RESULT_TOKENS * 0.9) / candidateTokenCount),
		);
	}
}

function splitHeadAndTail(value: string, excerptLength: number): { head: string; tail: string } {
	const headLength = Math.ceil(excerptLength / 2);
	const tailLength = Math.floor(excerptLength / 2);
	return {
		head: value.slice(0, headLength),
		tail: tailLength === 0 ? '' : value.slice(-tailLength),
	};
}
