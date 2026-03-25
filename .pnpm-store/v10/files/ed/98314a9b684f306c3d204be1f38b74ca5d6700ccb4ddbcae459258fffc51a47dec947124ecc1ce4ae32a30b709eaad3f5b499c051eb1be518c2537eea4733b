import Connection from '../connection/index.js';
import { BackupRestoreRequest, BackupRestoreResponse, BackupRestoreStatusResponse, RestoreConfig } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import BackupRestoreStatusGetter from './backupRestoreStatusGetter.js';
import { Backend } from './index.js';
export default class BackupRestorer extends CommandBase {
    private backend;
    private backupId;
    private excludeClassNames?;
    private includeClassNames?;
    private statusGetter;
    private waitForCompletion?;
    private config?;
    private overwriteAlias?;
    constructor(client: Connection, statusGetter: BackupRestoreStatusGetter);
    withIncludeClassNames(...classNames: string[]): this;
    withExcludeClassNames(...classNames: string[]): this;
    withBackend(backend: Backend): this;
    withBackupId(backupId: string): this;
    withWaitForCompletion(waitForCompletion: boolean): this;
    withOverwriteAlias(overwriteAlias: boolean): this;
    withConfig(cfg: RestoreConfig): this;
    validate: () => void;
    do: () => Promise<BackupRestoreResponse>;
    _restore: (payload: BackupRestoreRequest) => Promise<BackupRestoreResponse>;
    _restoreAndWaitForCompletion: (payload: BackupRestoreRequest) => Promise<BackupRestoreResponse>;
    private _path;
    _merge: (restoreStatusResponse: BackupRestoreStatusResponse, restoreResponse: BackupRestoreResponse) => BackupRestoreResponse;
}
