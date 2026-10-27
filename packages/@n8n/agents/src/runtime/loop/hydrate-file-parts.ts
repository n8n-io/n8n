import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { BuiltFileStore } from '../../types/sdk/file-store';
import {
	isFileRefPart,
	isTextMediaType,
	toolOutputFileParts,
	type AgentDbMessage,
	type ContentFile,
	type ContentFileWithRef,
	type ContentToolCall,
} from '../../types/sdk/message';

/** Only the newest file parts are hydrated; older ones stay reference-only. */
export const MAX_HYDRATED_FILE_PARTS = 20;
/** Cumulative cap on hydrated bytes in the live message list. */
export const MAX_HYDRATED_FILE_BYTES = 50 * 1024 * 1024;

/**
 * Fill `data` on reference-only file parts by loading bytes from the injected
 * file store. Mutates the blocks in place (persistence backends strip hydrated
 * bytes on save via `stripHydratedFileData`).
 *
 * The whole thread history passes through here on every turn, so hydration is
 * bounded: only the newest {@link MAX_HYDRATED_FILE_PARTS} parts are
 * considered, loads run sequentially newest-first, and loading stops charging
 * against a {@link MAX_HYDRATED_FILE_BYTES} budget once exhausted.
 *
 * A block stays reference-only — and is later rendered to the model as text
 * metadata by `toAiContent` — when any of these hold: no store is configured,
 * the store reports the media type as unsupported for the current model, the
 * reference is unknown, the load fails, or the count/byte budgets exclude it.
 */
export async function hydrateFileParts(
	messages: readonly AgentDbMessage[],
	fileStore: BuiltFileStore | undefined,
	scope?: { threadId?: string },
): Promise<void> {
	if (!fileStore) return;

	const blocks: ContentFile[] = [];
	for (const message of messages) {
		if (!('content' in message) || !Array.isArray(message.content)) continue;
		for (const block of message.content) {
			if (block.type !== 'file' || !block.fileRef) continue;
			if (fileStore.isMediaTypeSupported && !fileStore.isMediaTypeSupported(block.mediaType)) {
				delete block.data;
				continue;
			}
			blocks.push(block);
		}
	}

	for (const block of blocks.slice(0, -MAX_HYDRATED_FILE_PARTS)) delete block.data;
	let budget = MAX_HYDRATED_FILE_BYTES;
	const newestFirst = blocks.slice(-MAX_HYDRATED_FILE_PARTS).reverse();
	for (const block of newestFirst) {
		const existingData = block.data;
		delete block.data;
		if (budget <= 0) continue;
		const declaredSize = block.fileRef!.sizeBytes;
		if (existingData === undefined && declaredSize !== undefined && declaredSize > budget) continue;
		try {
			const data = existingData ?? (await fileStore.load(block.fileRef!, scope));
			if (!data) continue;
			const size = typeof data === 'string' ? Buffer.byteLength(data, 'base64') : data.byteLength;
			if (size > budget) continue;
			block.data = data;
			budget -= size;
		} catch {
			// Leave the block reference-only; the model sees its text metadata.
		}
	}
}

function resolvedToolCalls(
	messages: readonly AgentDbMessage[],
): Array<Extract<ContentToolCall, { state: 'resolved' }>> {
	return messages.flatMap((message) =>
		'content' in message && Array.isArray(message.content)
			? message.content.filter(
					(block): block is Extract<ContentToolCall, { state: 'resolved' }> =>
						block.type === 'tool-call' && block.state === 'resolved',
				)
			: [],
	);
}

/**
 * Load the bytes of file parts in tool outputs, such as the result of a tool
 * that reads a file for the model. The model gets these bytes in the next
 * model call only: after that call, {@link stubToolOutputFiles} replaces the
 * parts with a short text. Pass only the messages of the current turn, so
 * files from older turns are not loaded again.
 */
export async function loadToolOutputFiles(
	messages: readonly AgentDbMessage[],
	fileStore: BuiltFileStore | undefined,
	scope?: { threadId?: string },
): Promise<void> {
	if (!fileStore) return;
	let budget = MAX_HYDRATED_FILE_BYTES;
	const parts = resolvedToolCalls(messages).flatMap((block) => toolOutputFileParts(block.output));
	for (const part of parts) {
		if (part.data !== undefined) continue;
		const supported =
			isTextMediaType(part.mediaType) || (fileStore.isMediaTypeSupported?.(part.mediaType) ?? true);
		if (!supported) continue;
		try {
			const data = await fileStore.load(part.fileRef, scope);
			if (!data || data.byteLength > budget) continue;
			part.data = data;
			budget -= data.byteLength;
		} catch {
			// Leave the part without data; the model sees its text metadata.
		}
	}
}

function sentFileStub(part: ContentFileWithRef): string {
	const name = part.fileRef.fileName ?? 'file';
	return `[You viewed file "${name}" (fileId: ${part.fileRef.id}) in an earlier step. Its content is no longer attached, to save context. Read it again only if you need to look at it again.]`;
}

/**
 * Replace the file parts in tool outputs with a short text after a model call
 * got them, so later model calls do not send the bytes again.
 */
export function stubToolOutputFiles(messages: readonly AgentDbMessage[]): void {
	for (const block of resolvedToolCalls(messages)) {
		const output = block.output;
		if (toolOutputFileParts(output).length === 0) continue;
		if (!isRecord(output) || !Array.isArray(output.value)) continue;
		const value = output.value.map((part: unknown) =>
			isFileRefPart(part) ? { type: 'text', text: sentFileStub(part) } : part,
		);
		block.output = toJsonValue({ ...output, value });
	}
}
