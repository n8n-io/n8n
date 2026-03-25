import { ReplaySubject } from '../ReplaySubject';
import { share } from './share';
export function shareReplay(configOrBufferSize, windowTime, scheduler) {
    let bufferSize;
    let refCount = false;
    if (configOrBufferSize && typeof configOrBufferSize === 'object') {
        ({ bufferSize = Infinity, windowTime = Infinity, refCount = false, scheduler } = configOrBufferSize);
    }
    else {
        bufferSize = (configOrBufferSize !== null && configOrBufferSize !== void 0 ? configOrBufferSize : Infinity);
    }
    return share({
        connector: () => new ReplaySubject(bufferSize, windowTime, scheduler),
        resetOnError: true,
        resetOnComplete: false,
        resetOnRefCountZero: refCount,
    });
}
//# sourceMappingURL=shareReplay.js.map