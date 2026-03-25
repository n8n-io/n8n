import { Observable } from '../Observable';
import { innerFrom } from './innerFrom';
export function defer(observableFactory) {
    return new Observable((subscriber) => {
        innerFrom(observableFactory()).subscribe(subscriber);
    });
}
//# sourceMappingURL=defer.js.map