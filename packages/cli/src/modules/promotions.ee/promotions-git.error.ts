import { BadRequestError } from '@n8n/errors';

/** A Git operation failed against the remote. The message never carries Git output. */
export class PromotionGitError extends BadRequestError {}
