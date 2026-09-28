import { NotFoundError } from '@/errors/response-errors/not-found.error';

/** Thrown when a binding's `dataTableId` doesn't resolve to a data table the acting user can read (and write, when asked). */
export class BindingDataTableNotFoundError extends NotFoundError {
	constructor(key: string, dataTableId: string) {
		super(`Binding '${key}': could not find the data table '${dataTableId}'.`);
	}
}
