import type { BuiltFileStore } from '../../types/sdk/file-store';
import type { AgentDbMessage, ContentFile } from '../../types/sdk/message';

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
