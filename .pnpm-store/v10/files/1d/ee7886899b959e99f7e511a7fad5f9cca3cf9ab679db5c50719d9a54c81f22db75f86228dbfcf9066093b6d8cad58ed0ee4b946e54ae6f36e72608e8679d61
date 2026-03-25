import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { OperatorFunction } from '../types';
/**
 * Used to determine if an object is an Observable with a lift function.
 */
export declare function hasLift(source: any): source is {
    lift: InstanceType<typeof Observable>['lift'];
};
/**
 * Creates an `OperatorFunction`. Used to define operators throughout the library in a concise way.
 * @param init The logic to connect the liftedSource to the subscriber at the moment of subscription.
 */
export declare function operate<T, R>(init: (liftedSource: Observable<T>, subscriber: Subscriber<R>) => (() => void) | void): OperatorFunction<T, R>;
//# sourceMappingURL=lift.d.ts.map