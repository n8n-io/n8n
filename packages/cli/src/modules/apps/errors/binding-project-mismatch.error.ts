import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/** The served app acts as its project, so it can only reach workflows and data tables that project owns. */
export class BindingProjectMismatchError extends BadRequestError {
	constructor(key: string, resource: 'workflow' | 'data table', name: string) {
		super(
			`Binding '${key}': ${resource} "${name}" belongs to another project. Only ${resource}s in the app's project can be bound.`,
		);
	}
}
