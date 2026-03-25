"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
const execute_1 = require("./execute");
/**
 * Returns a promise that fulfills after delay and rejects with
 * `AbortError` once `signal` is aborted.
 *
 * The delay time is specified as a `Date` object or as an integer denoting
 * milliseconds to wait.
 *
 * Example:
 *
 *     // Make requests repeatedly with a delay between consecutive requests
 *     while (true) {
 *       await makeRequest(signal, params);
 *       await delay(signal, 1000);
 *     }
 *
 * Example:
 *
 *     // Make requests repeatedly with a fixed interval
 *     import {addMilliseconds} from 'date-fns';
 *
 *     let date = new Date();
 *
 *     while (true) {
 *       await makeRequest(signal, params);
 *
 *       date = addMilliseconds(date, 1000);
 *       await delay(signal, date);
 *     }
 */
function delay(signal, dueTime) {
    return (0, execute_1.execute)(signal, resolve => {
        const ms = typeof dueTime === 'number' ? dueTime : dueTime.getTime() - Date.now();
        const timer = setTimeout(resolve, ms);
        return () => {
            clearTimeout(timer);
        };
    });
}
exports.delay = delay;
//# sourceMappingURL=delay.js.map