import { Service } from '@n8n/di';

/**
 * Contract for a project-owned resource that lives outside the core transfer
 * flow. Implementations register on module init so the ownership transfer flow
 * can move or remove the resource without reaching into module code.
 */
export interface ProjectOwnershipTransferHandler<TTransaction> {
	/** Resource name for logs and error messages. */
	readonly resource: string;

	/** Move all rows from one project to another in the shared transaction. */
	transferAll(fromProjectId: string, toProjectId: string, trx: TTransaction): Promise<void>;

	/** Remove all rows owned by the project before the project is deleted. */
	deleteAll(projectId: string): Promise<void>;

	/**
	 * Remove the private rows of a user before the user is deleted, in every
	 * project. It runs also when the user's projects are transferred, because
	 * private rows do not move to the transferee. Optional: most resources
	 * belong to a project, not to a user.
	 */
	deleteAllForUser?(userId: string): Promise<void>;
}

@Service()
export class OwnershipTransferHandlerRegistry<TTransaction> {
	private readonly handlers: Array<ProjectOwnershipTransferHandler<TTransaction>> = [];

	register(handler: ProjectOwnershipTransferHandler<TTransaction>) {
		this.handlers.push(handler);
	}

	getAll(): ReadonlyArray<ProjectOwnershipTransferHandler<TTransaction>> {
		return this.handlers;
	}
}
