import { UserError } from 'n8n-workflow';

/**
 * Thrown when a v1 workflow uses a construct the converter does not (yet)
 * support. Caused by user-provided workflow content, hence a `UserError`.
 */
export class UnsupportedWorkflowError extends UserError {}
