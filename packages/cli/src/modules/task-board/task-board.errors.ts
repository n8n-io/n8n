import { UserError } from '@n8n/errors';

/** The board, column or task does not exist, or it belongs to another project. */
export class TaskBoardNotFoundError extends UserError {}

/** The input refers to something that the board cannot use, such as a foreign column. */
export class TaskBoardValidationError extends UserError {}
