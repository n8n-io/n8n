import type { AuthenticatedRequest } from '@n8n/db';
import type { Readable } from 'node:stream';

/**
 * Who performed an operation on a project file.
 *
 * Only `user` is produced in Phase 1. `workflow` exists because the columns and
 * FKs it maps onto already exist, so the Project File node can start writing it
 * without a migration.
 */
export type ProjectFileActor =
	| { type: 'user'; userId: string }
	| { type: 'workflow'; workflowId: string };

/** Where the bytes of an incoming file come from. */
export type ProjectFileSource =
	/** A temp file on disk, e.g. staged by multer. Streamed, never fully buffered. */
	| { type: 'path'; path: string }
	| { type: 'buffer'; buffer: Buffer }
	/** An open read stream, e.g. a persisted execution binary. Never fully buffered. */
	| { type: 'stream'; stream: Readable };

export type ProjectFileListOptions = {
	take?: number;
	skip?: number;
	/** Case-insensitive substring match on the file name. */
	search?: string;
};

/** Which budget an upload is charged against, decided by the project's type. */
export type ProjectFileQuotaScope = 'project' | 'personal';

export type ProjectFileUsage = {
	usedBytes: number;
	quotaBytes: number;
	scope: ProjectFileQuotaScope;
};

export type MulterDestinationCallback = (error: Error | null, destination: string) => void;
export type MulterFilenameCallback = (error: Error | null, filename: string) => void;

export type ProjectFileRequestWithFile = AuthenticatedRequest<{
	projectId: string;
	fileId?: string;
}> & {
	file?: Express.Multer.File;
	/** Set by the upload middleware; multer runs before the controller can catch. */
	fileUploadError?: Error;
};

/** Column values for an actor, for `INSERT`/`UPDATE`. */
export function toActorColumns(actor: ProjectFileActor, prefix: 'createdBy' | 'updatedBy') {
	const userId = actor.type === 'user' ? actor.userId : null;
	const workflowId = actor.type === 'workflow' ? actor.workflowId : null;

	return prefix === 'createdBy'
		? { createdById: userId, createdByWorkflowId: workflowId }
		: { updatedById: userId, updatedByWorkflowId: workflowId };
}
