import { TypeORMError } from './TypeORMError';

/**
 * Thrown when user saves tree children entity but its parent is not saved yet.
 */
export class CannotAttachTreeChildrenEntityError extends TypeORMError {
	constructor(entityName: string) {
		super(
			`Cannot attach entity "${entityName}" to its parent. Please make sure parent ` +
				`is saved in the database before saving children nodes.`,
		);
	}
}
