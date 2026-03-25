import { switchMap } from './switchMap';
import { operate } from '../util/lift';
export function switchScan(accumulator, seed) {
    return operate((source, subscriber) => {
        let state = seed;
        switchMap((value, index) => accumulator(state, value, index), (_, innerValue) => ((state = innerValue), innerValue))(source).subscribe(subscriber);
        return () => {
            state = null;
        };
    });
}
//# sourceMappingURL=switchScan.js.map