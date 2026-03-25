import Connection from '../connection/index.js';
import BackupCreateStatusGetter from './backupCreateStatusGetter.js';
import BackupCreator from './backupCreator.js';
import BackupRestoreStatusGetter from './backupRestoreStatusGetter.js';
import BackupRestorer from './backupRestorer.js';
export type Backend = 'filesystem' | 's3' | 'gcs' | 'azure';
export type BackupStatus = 'STARTED' | 'TRANSFERRING' | 'TRANSFERRED' | 'SUCCESS' | 'FAILED';
export type BackupCompressionLevel = 'DefaultCompression' | 'BestSpeed' | 'BestCompression';
export interface Backup {
    creator: () => BackupCreator;
    createStatusGetter: () => BackupCreateStatusGetter;
    restorer: () => BackupRestorer;
    restoreStatusGetter: () => BackupRestoreStatusGetter;
}
declare const backup: (client: Connection) => Backup;
export default backup;
export { default as BackupCreateStatusGetter } from './backupCreateStatusGetter.js';
export { default as BackupCreator } from './backupCreator.js';
export { default as BackupRestoreStatusGetter } from './backupRestoreStatusGetter.js';
export { default as BackupRestorer } from './backupRestorer.js';
