import BackupCreateStatusGetter from './backupCreateStatusGetter.js';
import BackupCreator from './backupCreator.js';
import BackupRestoreStatusGetter from './backupRestoreStatusGetter.js';
import BackupRestorer from './backupRestorer.js';
const backup = (client) => {
    return {
        creator: () => new BackupCreator(client, new BackupCreateStatusGetter(client)),
        createStatusGetter: () => new BackupCreateStatusGetter(client),
        restorer: () => new BackupRestorer(client, new BackupRestoreStatusGetter(client)),
        restoreStatusGetter: () => new BackupRestoreStatusGetter(client),
    };
};
export default backup;
export { default as BackupCreateStatusGetter } from './backupCreateStatusGetter.js';
export { default as BackupCreator } from './backupCreator.js';
export { default as BackupRestoreStatusGetter } from './backupRestoreStatusGetter.js';
export { default as BackupRestorer } from './backupRestorer.js';
