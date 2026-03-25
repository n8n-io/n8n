import { BehaviorSubject } from '../BehaviorSubject';
import { ConnectableObservable } from '../observable/ConnectableObservable';
export function publishBehavior(initialValue) {
    return function (source) {
        var subject = new BehaviorSubject(initialValue);
        return new ConnectableObservable(source, function () { return subject; });
    };
}
//# sourceMappingURL=publishBehavior.js.map