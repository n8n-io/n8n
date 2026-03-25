interface MutexInterface {
    acquire(priority?: number): Promise<MutexInterface.Releaser>;
    runExclusive<T>(callback: MutexInterface.Worker<T>, priority?: number): Promise<T>;
    waitForUnlock(priority?: number): Promise<void>;
    isLocked(): boolean;
    release(): void;
    cancel(): void;
}
declare namespace MutexInterface {
    interface Releaser {
        (): void;
    }
    interface Worker<T> {
        (): Promise<T> | T;
    }
}
export default MutexInterface;
