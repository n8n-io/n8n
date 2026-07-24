import type { BuiltFileStore } from '../../types/sdk/file-store';
import type { AgentDbMessage, ContentFile } from '../../types/sdk/message';

/**
 * Fill `data` on reference-only file parts by loading bytes from the injected
 * file store. Mutates the blocks in place (persistence backends strip hydrated
 * bytes on save via `stripHydratedFileData`).
 *
 * A block stays reference-only — and is later rendered to the model as text
 * metadata by `toAiContent` — when any of these hold: no store is configured,
 * the store reports the media type as unsupported for the current model, the
 * reference is unknown, or the load fails.
 */
export async function hydrateFileParts(
	messages: readonly AgentDbMessage[],
	fileStore: BuiltFileStore | undefined,
): Promise<void> {
	if (!fileStore) return;

	const blocks: ContentFile[] = [];
	for (const message of messages) {
		if (!('content' in message) || !Array.isArray(message.content)) continue;
		for (const block of message.content) {
			if (block.type !== 'file' || !block.fileRef || block.data !== undefined) continue;
			if (fileStore.isMediaTypeSupported && !fileStore.isMediaTypeSupported(block.mediaType)) {
				continue;
			}
			blocks.push(block);
		}
	}

	await Promise.all(
		blocks.map(async (block) => {
			try {
				const data = await fileStore.load(block.fileRef!);
				if (data) block.data = data;
			} catch {
				// Leave the block reference-only; the model sees its text metadata.
			}
		}),
	);
}
