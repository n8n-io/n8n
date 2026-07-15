import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';

/**
 * Contract for a project-owned resource that lives outside the core transfer
 * flow (typically in a backend module). Implementations are registered on
 * module init, so `OwnershipTransferService` can move or clean up the
 * resource generically without reaching into module code.
 */
export interface ProjectOwnershipTransferHandler {
	/** Resource name, for logs and error messages */
	readonly resource: string;

	/**
	 * Move all rows owned by `fromProjectId` to `toProjectId`. Runs inside the
	 * shared transfer transaction, so a failure rolls back the whole transfer.
	 */
	transferAll(fromProjectId: string, toProjectId: string, trx: EntityManager): Promise<void>;

	/** Remove all rows owned by the project, before the project itself is deleted. */
	deleteAll(projectId: string): Promise<void>;
}

@Service()
export class OwnershipTransferHandlerRegistry {
	private readonly handlers: ProjectOwnershipTransferHandler[] = [];

	register(handler: ProjectOwnershipTransferHandler) {
		this.handlers.push(handler);
	}

	getAll(): readonly ProjectOwnershipTransferHandler[] {
		return this.handlers;
	}
}
