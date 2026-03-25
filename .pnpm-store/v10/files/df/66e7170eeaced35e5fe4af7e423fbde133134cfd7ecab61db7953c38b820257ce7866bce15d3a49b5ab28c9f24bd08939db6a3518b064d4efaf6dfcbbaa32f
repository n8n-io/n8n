import Connection from '../connection/index.js';
import { BackupConfig, BackupCreateRequest, BackupCreateResponse, BackupCreateStatusResponse } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import BackupCreateStatusGetter from './backupCreateStatusGetter.js';
import { Backend } from './index.js';
export default class BackupCreator extends CommandBase {
    private backend;
    private backupId;
    private excludeClassNames?;
    private includeClassNames?;
    private statusGetter;
    private waitForCompletion;
    private config?;
    constructor(client: Connection, statusGetter: BackupCreateStatusGetter);
    withIncludeClassNames(...classNames: string[]): this;
    withExcludeClassNames(...classNames: string[]): this;
    withBackend(backend: Backend): this;
    withBackupId(backupId: string): this;
    withWaitForCompletion(waitForCompletion: boolean): this;
    withConfig(cfg: BackupConfig): this;
    validate: () => void;
    do: () => Promise<BackupCreateResponse>;
    _create: (payload: BackupCreateRequest) => Promise<BackupCreateResponse>;
    _createAndWaitForCompletion: (payload: BackupCreateRequest) => Promise<BackupCreateResponse>;
    private _path;
    _merge: (createStatusResponse: BackupCreateStatusResponse, createResponse: BackupCreateResponse) => BackupCreateResponse;
}
