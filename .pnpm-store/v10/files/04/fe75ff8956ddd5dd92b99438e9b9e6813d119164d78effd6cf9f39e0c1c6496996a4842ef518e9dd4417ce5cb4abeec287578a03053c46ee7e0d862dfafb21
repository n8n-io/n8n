import type { TimerHandle } from './timerHandle';
declare type SetIntervalFunction = (handler: () => void, timeout?: number, ...args: any[]) => TimerHandle;
declare type ClearIntervalFunction = (handle: TimerHandle) => void;
interface IntervalProvider {
    setInterval: SetIntervalFunction;
    clearInterval: ClearIntervalFunction;
    delegate: {
        setInterval: SetIntervalFunction;
        clearInterval: ClearIntervalFunction;
    } | undefined;
}
export declare const intervalProvider: IntervalProvider;
export {};
//# sourceMappingURL=intervalProvider.d.ts.map