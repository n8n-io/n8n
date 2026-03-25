import { Backend } from '../../backup/index.js';
import Connection from '../../connection/index.js';
import { BackupArgs, BackupCancelArgs, BackupConfigCreate, BackupConfigRestore, BackupReturn, BackupStatusArgs, BackupStatusReturn } from './types.js';
export declare const backup: (connection: Connection) => Backup;
export interface Backup {
    /**
     * Cancel a backup.
     *
     * @param {BackupCancelArgs} args The arguments for the request.
     * @returns {Promise<boolean>} Whether the backup was canceled.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     * @throws {WeaviateBackupCancellationError} If the backup cancellation fails.
     */
    cancel(args: BackupCancelArgs): Promise<boolean>;
    /**
     * Create a backup of the database.
     *
     * @param {BackupArgs} args The arguments for the request.
     * @returns {Promise<BackupReturn>} The response from Weaviate.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     * @throws {WeaviateBackupFailed} If the backup creation fails.
     * @throws {WeaviateBackupCanceled} If the backup creation is canceled.
     */
    create(args: BackupArgs<BackupConfigCreate>): Promise<BackupReturn>;
    /**
     * Get the status of a backup creation.
     *
     * @param {BackupStatusArgs} args The arguments for the request.
     * @returns {Promise<BackupStatusReturn>} The status of the backup creation.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     */
    getCreateStatus(args: BackupStatusArgs): Promise<BackupStatusReturn>;
    /**
     * Get the status of a backup restore.
     *
     * @param {BackupStatusArgs} args The arguments for the request.
     * @returns {Promise<BackupStatusReturn>} The status of the backup restore.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     */
    getRestoreStatus(args: BackupStatusArgs): Promise<BackupStatusReturn>;
    /**
     * Restore a backup of the database.
     *
     * @param {BackupArgs} args The arguments for the request.
     * @returns {Promise<BackupReturn>} The response from Weaviate.
     * @throws {WeaviateInvalidInputError} If the input is invalid.
     * @throws {WeaviateBackupFailed} If the backup restoration fails.
     * @throws {WeaviateBackupCanceled} If the backup restoration is canceled.
     */
    restore(args: BackupArgs<BackupConfigRestore>): Promise<BackupReturn>;
    /** List existing backups (completed and in-progress) created in a given backend.
     *
     * @param {Backend} backend Backend whence to list backups.
     * @returns {Promise<BackupReturn[]>} The response from Weaviate.
     * */
    list(backend: Backend): Promise<BackupReturn[]>;
}
