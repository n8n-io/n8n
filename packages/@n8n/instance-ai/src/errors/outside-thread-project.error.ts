import { OperationalError } from 'n8n-workflow';

/**
 * Thrown when an Instance AI write targets a resource outside the thread's
 * project. A conversation bound to a project can read across projects but
 * changes resources only in its own project.
 */
export class OutsideThreadProjectError extends OperationalError {
	constructor() {
		// The user sees this text too, so it addresses them, not the agent.
		super(
			'This conversation only has permission to make changes in its own project. ' +
				'To change this, start a conversation in the project that owns it.',
			{ level: 'warning' },
		);
	}
}

export function isOutsideThreadProjectError(error: unknown): boolean {
	if (error instanceof OutsideThreadProjectError) return true;
	return error instanceof Error && error.cause instanceof OutsideThreadProjectError;
}
