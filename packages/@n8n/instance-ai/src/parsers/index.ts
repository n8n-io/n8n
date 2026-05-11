/**
 * Public parser surface for downstream packages (`packages/cli/...`).
 *
 * This entry point intentionally avoids importing anything from `../agent`
 * or other Mastra-tainted modules so it remains safe to consume from
 * Jest CJS test environments.
 */

export {
	classifyAttachments,
	buildAttachmentManifest,
	isStructuredAttachment,
	isParseableAttachment,
	detectFormat,
} from './structured-file-parser';
export type {
	ClassifiedAttachment,
	ParseableFormat,
	TabularFormat,
	TextLikeFormat,
	SupportedFormat,
	AttachmentInfo,
} from './structured-file-parser';
export {
	getParseableAttachmentMimeTypes,
	getSupportedAttachmentMimeTypes,
	isSupportedAttachmentMimeType,
	validateAttachmentMimeTypes,
	UnsupportedAttachmentError,
} from './validate-attachments';
export type { UnsupportedAttachmentDetail } from './validate-attachments';
