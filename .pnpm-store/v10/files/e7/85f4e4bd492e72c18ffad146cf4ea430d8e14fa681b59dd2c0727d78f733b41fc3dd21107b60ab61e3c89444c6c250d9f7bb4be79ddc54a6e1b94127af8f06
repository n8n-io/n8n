import { AsyncSubject } from '../AsyncSubject';
import { ConnectableObservable } from '../observable/ConnectableObservable';
export function publishLast() {
    return function (source) {
        var subject = new AsyncSubject();
        return new ConnectableObservable(source, function () { return subject; });
    };
}
//# sourceMappingURL=publishLast.js.map