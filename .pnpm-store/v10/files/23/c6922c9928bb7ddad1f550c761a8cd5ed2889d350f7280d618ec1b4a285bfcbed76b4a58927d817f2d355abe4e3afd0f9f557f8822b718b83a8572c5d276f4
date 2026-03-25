"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyAdapters = void 0;
/**
 * Helper functions used when interacting with APIs that do not follow modern coding practices.
 * @public
 */
class LegacyAdapters {
    static convertCallbackToPromise(fn, arg1, arg2, arg3, arg4) {
        return new Promise((resolve, reject) => {
            const cb = (error, result) => {
                if (error) {
                    reject(LegacyAdapters.scrubError(error));
                }
                else {
                    resolve(result);
                }
            };
            try {
                if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined && arg4 !== undefined) {
                    fn(arg1, arg2, arg3, arg4, cb);
                }
                else if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined) {
                    fn(arg1, arg2, arg3, cb);
                }
                else if (arg1 !== undefined && arg2 !== undefined) {
                    fn(arg1, arg2, cb);
                }
                else if (arg1 !== undefined) {
                    fn(arg1, cb);
                }
                else {
                    fn(cb);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
    /**
     * Normalizes an object into an `Error` object.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static scrubError(error) {
        if (error instanceof Error) {
            return error;
        }
        else if (typeof error === 'string') {
            return new Error(error);
        }
        else {
            const errorObject = new Error('An error occurred.');
            errorObject.errorData = error; // eslint-disable-line @typescript-eslint/no-explicit-any
            return errorObject;
        }
    }
}
exports.LegacyAdapters = LegacyAdapters;
//# sourceMappingURL=LegacyAdapters.js.map