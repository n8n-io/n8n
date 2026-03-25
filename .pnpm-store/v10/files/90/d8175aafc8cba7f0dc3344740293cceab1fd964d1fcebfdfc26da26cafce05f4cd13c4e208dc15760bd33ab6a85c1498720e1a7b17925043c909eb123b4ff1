import { Backend } from '../../backup/index.js';
import Connection from '../../connection/index.js';
import { BackupReturn, BackupStatusArgs, BackupStatusReturn } from './types.js';
/** The arguments required to create and restore backups. */
export type BackupCollectionArgs = {
    /** The ID of the backup. */
    backupId: string;
    /** The backend to use for the backup. */
    backend: Backend;
    /** The collections to include in the backup. */
    waitForCompletion?: boolean;
};
export declare const backupCollection: (connection: Connection, name: string) => {
    create: (args: BackupCollectionArgs) => Promise<BackupReturn>;
    getCreateStatus: (args: BackupStatusArgs) => Promise<BackupStatusReturn>;
    getRestoreStatus: (args: BackupStatusArgs) => Promise<BackupStatusReturn>;
    restore: (args: BackupCollectionArgs) => Promise<BackupReturn>;
};
export interface BackupCollection {
    /**
     * Create a backup of this collection.
     *
     * @param {BackupArgs} args The arguments for the request.
     * @returns {Promise<BackupReturn>} The response from Weaviate.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     * @throws {WeaviateBackupFailed} If the backup creation fails.
     * @throws {WeaviateBackupCanceled} If the backup creation is canceled.
     */
    create(args: BackupCollectionArgs): Promise<BackupReturn>;
    /**
     * Get the status of a backup.
     *
     * @param {BackupStatusArgs} args The arguments for the request.
     * @returns {Promise<BackupStatusReturn>} The status of the backup.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     */
    getCreateStatus(args: BackupStatusArgs): Promise<BackupStatusReturn>;
    /**
     * Get the status of a restore.
     *
     * @param {BackupStatusArgs} args The arguments for the request.
     * @returns {Promise<BackupStatusReturn>} The status of the restore.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     */
    getRestoreStatus(args: BackupStatusArgs): Promise<BackupStatusReturn>;
    /**
     * Restore a backup of this collection.
     *
     * @param {BackupArgs} args The arguments for the request.
     * @returns {Promise<BackupReturn>} The response from Weaviate.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     * @throws {WeaviateBackupFailed} If the backup restoration fails.
     * @throws {WeaviateBackupCanceled} If the backup restoration is canceled.
     */
    restore(args: BackupCollectionArgs): Promise<BackupReturn>;
}
