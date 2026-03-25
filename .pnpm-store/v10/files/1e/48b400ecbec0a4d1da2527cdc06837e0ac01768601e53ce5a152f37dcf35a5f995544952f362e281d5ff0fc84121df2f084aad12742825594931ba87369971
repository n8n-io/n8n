import { BehaviorSubject } from '../BehaviorSubject';
import { ConnectableObservable } from '../observable/ConnectableObservable';
export function publishBehavior(initialValue) {
    return (source) => {
        const subject = new BehaviorSubject(initialValue);
        return new ConnectableObservable(source, () => subject);
    };
}
//# sourceMappingURL=publishBehavior.js.map