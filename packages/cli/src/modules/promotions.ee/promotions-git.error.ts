import { BadRequestError } from '@n8n/errors';

/** A Git call to the remote failed. The message never carries Git output. */
export class PromotionGitError extends BadRequestError {}

/**
 * A local step of a Git operation failed, such as a local Git command or a file write.
 * It answers like a bad request, but it is not the user's fault.
 */
export class PromotionLocalGitError extends BadRequestError {}
