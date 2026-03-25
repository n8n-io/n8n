import { operate } from '../util/lift';
export function finalize(callback) {
    return operate(function (source, subscriber) {
        try {
            source.subscribe(subscriber);
        }
        finally {
            subscriber.add(callback);
        }
    });
}
//# sourceMappingURL=finalize.js.map