/**
 * Parses the process start time from the contents of a linux /proc/[pid]/stat file.
 * @param stat - The contents of a linux /proc/[pid]/stat file.
 * @returns The process start time in jiffies, or undefined if stat has an unexpected format.
 */
export declare function getProcessStartTimeFromProcStat(stat: string): string | undefined;
/**
 * Helper function that is exported for unit tests only.
 * Returns undefined if the process doesn't exist with that pid.
 */
export declare function getProcessStartTime(pid: number): string | undefined;
/**
 * The `LockFile` implements a file-based mutex for synchronizing access to a shared resource
 * between multiple Node.js processes.  It is not recommended for synchronization solely within
 * a single Node.js process.
 * @remarks
 * The implementation works on Windows, Mac, and Linux without requiring any native helpers.
 * On non-Windows systems, the algorithm requires access to the `ps` shell command.  On Linux,
 * it requires access the `/proc/${pidString}/stat` filesystem.
 * @public
 */
export declare class LockFile {
    private static _getStartTime;
    private _fileWriter;
    private _filePath;
    private _dirtyWhenAcquired;
    private constructor();
    /**
     * Returns the path of the lockfile that will be created when a lock is successfully acquired.
     * @param resourceFolder - The folder where the lock file will be created
     * @param resourceName - An alphanumeric name that describes the resource being locked.  This will become
     *   the filename of the temporary file created to manage the lock.
     * @param pid - The PID for the current Node.js process (`process.pid`), which is used by the locking algorithm.
     */
    static getLockFilePath(resourceFolder: string, resourceName: string, pid?: number): string;
    /**
     * Attempts to create a lockfile with the given filePath.
     * @param resourceFolder - The folder where the lock file will be created
     * @param resourceName - An alphanumeric name that describes the resource being locked.  This will become
     *   the filename of the temporary file created to manage the lock.
     * @returns If successful, returns a `LockFile` instance.  If unable to get a lock, returns `undefined`.
     */
    static tryAcquire(resourceFolder: string, resourceName: string): LockFile | undefined;
    /**
     * @deprecated Use {@link LockFile.acquireAsync} instead.
     */
    static acquire(resourceFolder: string, resourceName: string, maxWaitMs?: number): Promise<LockFile>;
    /**
     * Attempts to create the lockfile.  Will continue to loop at every 100ms until the lock becomes available
     * or the maxWaitMs is surpassed.
     *
     * @remarks
     * This function is subject to starvation, whereby it does not ensure that the process that has been
     * waiting the longest to acquire the lock will get it first. This means that a process could theoretically
     * wait for the lock forever, while other processes skipped it in line and acquired the lock first.
     *
     * @param resourceFolder - The folder where the lock file will be created
     * @param resourceName - An alphanumeric name that describes the resource being locked.  This will become
     *   the filename of the temporary file created to manage the lock.
     * @param maxWaitMs - The maximum number of milliseconds to wait for the lock before reporting an error
     */
    static acquireAsync(resourceFolder: string, resourceName: string, maxWaitMs?: number): Promise<LockFile>;
    private static _tryAcquireInner;
    /**
     * Attempts to acquire the lock on a Linux or OSX machine
     */
    private static _tryAcquireMacOrLinux;
    /**
     * Attempts to acquire the lock using Windows
     * This algorithm is much simpler since we can rely on the operating system
     */
    private static _tryAcquireWindows;
    /**
     * Unlocks a file and optionally removes it from disk.
     * This can only be called once.
     *
     * @param deleteFile - Whether to delete the lockfile from disk. Defaults to true.
     */
    release(deleteFile?: boolean): void;
    /**
     * Returns the initial state of the lock.
     * This can be used to detect if the previous process was terminated before releasing the resource.
     */
    get dirtyWhenAcquired(): boolean;
    /**
     * Returns the absolute path to the lockfile
     */
    get filePath(): string;
    /**
     * Returns true if this lock is currently being held.
     */
    get isReleased(): boolean;
}
//# sourceMappingURL=LockFile.d.ts.map