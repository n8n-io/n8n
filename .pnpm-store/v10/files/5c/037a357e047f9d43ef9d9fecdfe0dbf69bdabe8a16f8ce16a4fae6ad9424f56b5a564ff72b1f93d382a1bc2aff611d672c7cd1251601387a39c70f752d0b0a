export declare type EventCallback = (data?: any) => void;
export interface StreamWrapper<WritableStream, ReadFormat> {
    setEncoding(encoding?: string): void;
    on(event: string, callback: EventCallback): void;
    off(event: string, callback: EventCallback): void;
    pipe(dest: WritableStream): WritableStream;
    pipeTo(dest: WritableStream): WritableStream;
    unpipe(dest?: WritableStream): void;
    destroy(error?: Error): void;
    pause(): void;
    resume(): void;
    get isPaused(): boolean;
    read(): Promise<ReadFormat | undefined>;
    text(): Promise<string>;
    json<T>(): Promise<T>;
    [Symbol.asyncIterator](): AsyncIterableIterator<ReadFormat>;
}
export declare function chooseStreamWrapper(responseBody: any): Promise<Promise<StreamWrapper<any, any>>>;
