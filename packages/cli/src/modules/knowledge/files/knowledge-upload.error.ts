import { BadRequestError } from '@n8n/errors';
import type { InferTelemetryProps, TELEMETRY_EVENT } from '@n8n/telemetry';

type KnowledgeUploadFailure = Extract<
	InferTelemetryProps<typeof TELEMETRY_EVENT.AGENTS.USER_FAILED_AGENT_KNOWLEDGE_UPLOAD>,
	{ stage: 'server' }
>;

/** Every server reason except `unknown`, which covers the errors that are not this class. */
export type KnowledgeUploadFailureReason = Exclude<KnowledgeUploadFailure['reason'], 'unknown'>;

/**
 * A rejected knowledge file upload. The message is what the user sees. The
 * reason is a fixed code for the "User failed agent knowledge upload" event.
 */
export class KnowledgeUploadError extends BadRequestError {
	constructor(
		message: string,
		readonly reason: KnowledgeUploadFailureReason,
	) {
		super(message);
	}
}

/**
 * The error of a file whose extension is not allowed. The upload middleware and
 * `KnowledgeFileService.validateUploadMetadata` raise the same one.
 */
export function knowledgeFileTypeError(): KnowledgeUploadError {
	return new KnowledgeUploadError(
		'Only CSV, PDF, Markdown, and TXT files are allowed',
		'file_type',
	);
}
