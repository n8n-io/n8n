declare type QueueItem = () => void;
declare type IdleCallback = () => void | Promise<void>;
declare type AddCallback = () => void | Promise<void>;
interface Options {
    concurrency?: number;
}
declare class PromiseQueue {
    options: Required<Options>;
    running: number;
    queue: QueueItem[];
    idleCallbacks: IdleCallback[];
    constructor({ concurrency }?: Options);
    clear(): void;
    onIdle(callback: IdleCallback): () => void;
    waitTillIdle(): Promise<void>;
    add(callback: AddCallback): Promise<unknown>;
    private processNext;
}
export { PromiseQueue };
