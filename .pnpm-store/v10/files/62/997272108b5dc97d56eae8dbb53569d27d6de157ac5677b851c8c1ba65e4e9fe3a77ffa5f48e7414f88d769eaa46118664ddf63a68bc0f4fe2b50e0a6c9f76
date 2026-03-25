export declare class SimpleEventEmitter {
    events: {
        [key: string]: ((...args: any[]) => void)[];
    };
    constructor();
    on(event: string, listener: (...args: any[]) => void): () => void;
    emit(event: string, payload: any): void;
}
