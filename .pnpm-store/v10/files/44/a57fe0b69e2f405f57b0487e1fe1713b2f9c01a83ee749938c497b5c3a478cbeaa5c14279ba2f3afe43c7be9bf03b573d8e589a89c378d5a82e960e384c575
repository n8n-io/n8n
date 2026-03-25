import { ReplaySubject } from '../ReplaySubject';
import { multicast } from './multicast';
import { isFunction } from '../util/isFunction';
export function publishReplay(bufferSize, windowTime, selectorOrScheduler, timestampProvider) {
    if (selectorOrScheduler && !isFunction(selectorOrScheduler)) {
        timestampProvider = selectorOrScheduler;
    }
    const selector = isFunction(selectorOrScheduler) ? selectorOrScheduler : undefined;
    return (source) => multicast(new ReplaySubject(bufferSize, windowTime, timestampProvider), selector)(source);
}
//# sourceMappingURL=publishReplay.js.map