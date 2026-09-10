import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/** The served app acts as its project, so it can only call workflows that project owns. */
export class BindingProjectMismatchError extends BadRequestError {
	constructor(key: string, workflowName: string) {
		super(
			`Binding '${key}': workflow "${workflowName}" belongs to another project. Only workflows in the app's project can be bound.`,
		);
	}
}
