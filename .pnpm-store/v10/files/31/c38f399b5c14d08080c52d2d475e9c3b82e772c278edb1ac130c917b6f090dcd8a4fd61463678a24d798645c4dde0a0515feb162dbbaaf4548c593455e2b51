// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Map an optional value through a function
 * @internal
 */
const maybemap = (value, f) => value === undefined ? undefined : f(value);
const INTERRUPTED = new Error("The poller is already stopped");
/**
 * A promise that delays resolution until a certain amount of time (in milliseconds) has passed, with facilities for
 * robust cancellation.
 *
 * ### Example:
 *
 * ```javascript
 * let toCancel;
 *
 * // Wait 20 seconds, and optionally allow the function to be cancelled.
 * await delayMs(20000, (cancel) => { toCancel = cancel });
 *
 * // ... if `toCancel` is called before the 20 second timer expires, then the delayMs promise will reject.
 * ```
 *
 * @internal
 * @param ms - the number of milliseconds to wait before resolving
 * @param cb - a callback that can provide the caller with a cancellation function
 */
export function delayMs(ms) {
    let aborted = false;
    let toReject;
    return Object.assign(new Promise((resolve, reject) => {
        let token;
        toReject = () => {
            maybemap(token, clearTimeout);
            reject(INTERRUPTED);
        };
        // In the rare case that the operation is _already_ aborted, we will reject instantly. This could happen, for
        // example, if the user calls the cancellation function immediately without yielding execution.
        if (aborted) {
            toReject();
        }
        else {
            token = setTimeout(resolve, ms);
        }
    }), {
        cancel: () => {
            aborted = true;
            toReject === null || toReject === void 0 ? void 0 : toReject();
        },
    });
}
//# sourceMappingURL=delayMs.js.map