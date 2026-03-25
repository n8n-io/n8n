import { SchedulerLike } from '../types';
import { Observable } from '../Observable';
export declare function bindCallback(callbackFunc: (...args: any[]) => void, resultSelector: (...args: any[]) => any, scheduler?: SchedulerLike): (...args: any[]) => Observable<any>;
export declare function bindCallback<A extends readonly unknown[], R extends readonly unknown[]>(callbackFunc: (...args: [...A, (...res: R) => void]) => void, schedulerLike?: SchedulerLike): (...arg: A) => Observable<R extends [] ? void : R extends [any] ? R[0] : R>;
//# sourceMappingURL=bindCallback.d.ts.map