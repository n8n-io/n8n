import Connection from '../connection/index.js';
import { BackupCreateStatusResponse } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { Backend } from './index.js';
export default class BackupCreateStatusGetter extends CommandBase {
    private backend?;
    private backupId?;
    constructor(client: Connection);
    withBackend(backend: Backend): this;
    withBackupId(backupId: string): this;
    validate: () => void;
    do: () => Promise<BackupCreateStatusResponse>;
    private _path;
}
