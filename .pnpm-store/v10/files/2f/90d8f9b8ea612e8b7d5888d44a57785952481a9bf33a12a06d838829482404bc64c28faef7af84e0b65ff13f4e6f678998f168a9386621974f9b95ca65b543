import type { PersistentStorage } from "../../../types.js";
import type { AzureMonitorExporterOptions } from "../../../config.js";
/**
 * File system persist class.
 * @internal
 */
export declare class FileSystemPersist implements PersistentStorage {
    private _options?;
    static TEMPDIR_PREFIX: string;
    static FILENAME_SUFFIX: string;
    fileRetemptionPeriod: number;
    cleanupTimeOut: number;
    maxBytesOnDisk: number;
    private _enabled;
    private _tempDirectory;
    private _fileCleanupTimer;
    private _instrumentationKey;
    constructor(instrumentationKey: string, _options?: AzureMonitorExporterOptions | undefined);
    push(value: unknown[]): Promise<boolean>;
    shift(): Promise<unknown>;
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private _getFirstFileOnDisk;
    private _storeToDisk;
    private _fileCleanupTask;
}
//# sourceMappingURL=fileSystemPersist.d.ts.map