import { ConnectableObservable } from '../observable/ConnectableObservable';
import { isFunction } from '../util/isFunction';
import { connect } from './connect';
export function multicast(subjectOrSubjectFactory, selector) {
    const subjectFactory = isFunction(subjectOrSubjectFactory) ? subjectOrSubjectFactory : () => subjectOrSubjectFactory;
    if (isFunction(selector)) {
        return connect(selector, {
            connector: subjectFactory,
        });
    }
    return (source) => new ConnectableObservable(source, subjectFactory);
}
//# sourceMappingURL=multicast.js.map