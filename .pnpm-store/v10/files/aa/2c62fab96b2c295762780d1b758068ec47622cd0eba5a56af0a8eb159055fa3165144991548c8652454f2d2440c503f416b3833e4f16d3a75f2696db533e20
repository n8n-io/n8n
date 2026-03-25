import { execute } from './execute';
/**
 * Return a promise that never fulfills and only rejects with `AbortError` once
 * `signal` is aborted.
 */
export function forever(signal) {
    return execute(signal, () => () => { });
}
//# sourceMappingURL=forever.js.map