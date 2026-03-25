import type { TimerHandle } from './timerHandle';
declare type SetTimeoutFunction = (handler: () => void, timeout?: number, ...args: any[]) => TimerHandle;
declare type ClearTimeoutFunction = (handle: TimerHandle) => void;
interface TimeoutProvider {
    setTimeout: SetTimeoutFunction;
    clearTimeout: ClearTimeoutFunction;
    delegate: {
        setTimeout: SetTimeoutFunction;
        clearTimeout: ClearTimeoutFunction;
    } | undefined;
}
export declare const timeoutProvider: TimeoutProvider;
export {};
//# sourceMappingURL=timeoutProvider.d.ts.map