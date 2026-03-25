import { Backend, BackupCompressionLevel } from '../../index.js';
/** The status of a backup operation */
export type BackupStatus = 'STARTED' | 'TRANSFERRING' | 'TRANSFERRED' | 'SUCCESS' | 'FAILED' | 'CANCELED';
/** The status of a backup operation */
export type BackupStatusReturn = {
    /** The ID of the backup */
    id: string;
    /** The error message if the backup failed */
    error?: string;
    /** The path to the backup */
    path: string;
    /** The status of the backup */
    status: BackupStatus;
};
/** The return type of a backup creation or restoration operation */
export type BackupReturn = BackupStatusReturn & {
    /** The backend to which the backup was created or restored */
    backend: Backend;
    /** The collections that were included in the backup */
    collections: string[];
};
/** Configuration options available when creating a backup */
export type BackupConfigCreate = {
    /** The size of the chunks to use for the backup. */
    chunkSize?: number;
    /** The standard of compression to use for the backup. */
    compressionLevel?: BackupCompressionLevel;
    /** The percentage of CPU to use for the backup creation job. */
    cpuPercentage?: number;
};
/** Configuration options available when restoring a backup */
export type BackupConfigRestore = {
    /** The percentage of CPU to use for the backuop restoration job. */
    cpuPercentage?: number;
    /** Allows ovewriting the collection alias if there is a conflict. */
    overwriteAlias?: boolean;
};
/** The arguments required to create and restore backups. */
export type BackupArgs<C extends BackupConfigCreate | BackupConfigRestore> = {
    /** The ID of the backup. */
    backupId: string;
    /** The backend to use for the backup. */
    backend: Backend;
    /** The collections to include in the backup. */
    includeCollections?: string[];
    /** The collections to exclude from the backup. */
    excludeCollections?: string[];
    /** Whether to wait for the backup to complete. */
    waitForCompletion?: boolean;
    /** The configuration options for the backup. */
    config?: C;
};
/** The arguments required to get the status of a backup. */
export type BackupStatusArgs = {
    /** The ID of the backup. */
    backupId: string;
    /** The backend to use for the backup. */
    backend: Backend;
};
/** The arguments required to cancel a backup. */
export type BackupCancelArgs = {
    /** The ID of the backup. */
    backupId: string;
    /** The backend to use for the backup. */
    backend: Backend;
};
