import { Observable } from '../Observable';
import { isFunction } from '../util/isFunction';
export function throwError(errorOrErrorFactory, scheduler) {
    const errorFactory = isFunction(errorOrErrorFactory) ? errorOrErrorFactory : () => errorOrErrorFactory;
    const init = (subscriber) => subscriber.error(errorFactory());
    return new Observable(scheduler ? (subscriber) => scheduler.schedule(init, 0, subscriber) : init);
}
//# sourceMappingURL=throwError.js.map