import { Subject } from '../Subject';
import { innerFrom } from '../observable/innerFrom';
import { operate } from '../util/lift';
import { fromSubscribable } from '../observable/fromSubscribable';
const DEFAULT_CONFIG = {
    connector: () => new Subject(),
};
export function connect(selector, config = DEFAULT_CONFIG) {
    const { connector } = config;
    return operate((source, subscriber) => {
        const subject = connector();
        innerFrom(selector(fromSubscribable(subject))).subscribe(subscriber);
        subscriber.add(source.subscribe(subject));
    });
}
//# sourceMappingURL=connect.js.map