import MutexInterface from './MutexInterface';
declare class Mutex implements MutexInterface {
    constructor(cancelError?: Error);
    acquire(priority?: number): Promise<MutexInterface.Releaser>;
    runExclusive<T>(callback: MutexInterface.Worker<T>, priority?: number): Promise<T>;
    isLocked(): boolean;
    waitForUnlock(priority?: number): Promise<void>;
    release(): void;
    cancel(): void;
    private _semaphore;
}
export default Mutex;
