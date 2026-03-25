import { WeaviateInvalidInputError } from '../errors.js';
import { CommandBase } from '../validation/commandBase.js';
import { validateBackend, validateBackupId } from './validation.js';
export default class BackupRestoreStatusGetter extends CommandBase {
    constructor(client) {
        super(client);
        this.validate = () => {
            this.addErrors([...validateBackend(this.backend), ...validateBackupId(this.backupId)]);
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new WeaviateInvalidInputError('invalid usage: ' + this.errors.join(', ')));
            }
            return this.client.get(this._path());
        };
        this._path = () => {
            return `/backups/${this.backend}/${this.backupId}/restore`;
        };
    }
    withBackend(backend) {
        this.backend = backend;
        return this;
    }
    withBackupId(backupId) {
        this.backupId = backupId;
        return this;
    }
}
