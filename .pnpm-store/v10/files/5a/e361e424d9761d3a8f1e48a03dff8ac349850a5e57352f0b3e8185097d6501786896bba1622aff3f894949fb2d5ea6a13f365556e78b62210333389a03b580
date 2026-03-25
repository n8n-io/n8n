export type EventHandler = ((arg1: any, arg2: any, arg3: any, arg4: any) => void) | ((arg1: any, arg2: any, arg3: any) => void) | ((arg1: any, arg2: any) => void) | ((arg1: any) => void) | ((...args: any[]) => void);
export interface TypedEventEmitter<TEvents extends Record<keyof TEvents, EventHandler>> {
    on<TEvent extends keyof TEvents>(event: TEvent, callback: TEvents[TEvent]): this;
    once<TEvent extends keyof TEvents>(event: TEvent, callback: TEvents[TEvent]): this;
    prependListener<TEvent extends keyof TEvents>(event: TEvent, callback: TEvents[TEvent]): this;
    prependOnceListener<TEvent extends keyof TEvents>(event: TEvent, callback: TEvents[TEvent]): this;
    removeListener<TEvent extends keyof TEvents>(event: TEvent, callback: TEvents[TEvent]): this;
    off<TEvent extends keyof TEvents>(event: TEvent, callback: TEvents[TEvent]): this;
    removeAllListeners(event?: keyof TEvents): this;
    emit<TEvent extends keyof TEvents>(event: TEvent, ...args: Parameters<TEvents[TEvent]>): boolean;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners<TEvent extends keyof TEvents>(eventName: TEvent): TEvents[TEvent][];
    rawListeners<TEvent extends keyof TEvents>(eventName: TEvent): TEvents[TEvent][];
    listenerCount<TEvent extends keyof TEvents>(event: TEvent, listener?: TEvents[TEvent]): number;
    eventNames(): Array<keyof TEvents>;
}
export declare class TypedEventEmitter<TEvents extends Record<keyof TEvents, EventHandler>> {
}
