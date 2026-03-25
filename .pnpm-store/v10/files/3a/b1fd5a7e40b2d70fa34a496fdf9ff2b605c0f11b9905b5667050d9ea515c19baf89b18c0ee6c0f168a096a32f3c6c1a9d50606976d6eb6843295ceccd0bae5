import { AsyncSubject } from '../AsyncSubject';
import { ConnectableObservable } from '../observable/ConnectableObservable';
export function publishLast() {
    return (source) => {
        const subject = new AsyncSubject();
        return new ConnectableObservable(source, () => subject);
    };
}
//# sourceMappingURL=publishLast.js.map