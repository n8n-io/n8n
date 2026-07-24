import type { AgentMessage, Message } from '@n8n/agents';

import type { StoredAttachmentRef } from '../agent-chat-attachment.service';

/** Media-type families that can be promoted to model file parts (see `isAttachmentMediaTypeSupported`). */
function modelEligibleFamily(mimeType: string): 'image' | 'pdf' | 'audio' | null {
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType === 'application/pdf') return 'pdf';
	if (mimeType.startsWith('audio/')) return 'audio';
	return null;
}

/**
 * Verify a declared media type against the file's magic bytes before it can
 * be promoted to a model file part. Only model-eligible declarations are
 * checked; a mismatch demotes the file to `application/octet-stream`, which
 * always takes the text-metadata path. Other declarations pass through — they
 * never reach the model as bytes. An absent declaration (some channel
 * platforms omit it) resolves to whatever the magic bytes say.
 */
export async function resolveInboundMimeType(
	declared: string | undefined,
	data: Buffer,
): Promise<string> {
	const declaredFamily = declared ? modelEligibleFamily(declared) : null;
	if (declared && !declaredFamily) return declared;

	const { fileTypeFromBuffer } = await import('file-type');
	const sniffed = await fileTypeFromBuffer(data);
	if (!declared) return sniffed?.mime ?? 'application/octet-stream';
	if (!sniffed || modelEligibleFamily(sniffed.mime) !== declaredFamily) {
		return 'application/octet-stream';
	}
	return sniffed.mime;
}

/**
 * Build the user turn for a message with attachments: one text part (when
 * text is present) followed by a reference-only file part per attachment.
 *
 * No capability gating happens here — every attachment becomes a file part
 * carrying only its `fileRef`. The runtime hydrates the parts the current
 * model supports (via the injected `BuiltFileStore`) and presents the rest to
 * the model as text metadata with the fileId handle.
 */
export function buildInboundUserMessage(
	text: string,
	attachments: StoredAttachmentRef[],
): AgentMessage[] {
	const content: Message['content'] = [];
	if (text) {
		content.push({ type: 'text', text });
	}
	for (const attachment of attachments) {
		content.push({
			type: 'file',
			mediaType: attachment.mimeType,
			fileRef: {
				id: attachment.id,
				fileName: attachment.fileName,
				sizeBytes: attachment.sizeBytes,
			},
		});
	}
	return [{ role: 'user', content }];
}
