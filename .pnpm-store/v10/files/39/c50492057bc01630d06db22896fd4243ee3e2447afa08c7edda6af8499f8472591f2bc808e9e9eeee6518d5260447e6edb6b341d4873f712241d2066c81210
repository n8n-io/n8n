"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.areDeepEqual = areDeepEqual;
/**
 * Determines if two objects are deeply equal.
 * @public
 */
function areDeepEqual(a, b) {
    if (a === b) {
        return true;
    }
    else {
        const aType = typeof a;
        const bType = typeof b;
        if (aType !== bType) {
            return false;
        }
        else {
            if (aType === 'object') {
                if (a === null || b === null) {
                    // We already handled the case where a === b, so if either is null, they are not equal
                    return false;
                }
                else if (Array.isArray(a)) {
                    if (!Array.isArray(b) || a.length !== b.length) {
                        return false;
                    }
                    else {
                        for (let i = 0; i < a.length; ++i) {
                            if (!areDeepEqual(a[i], b[i])) {
                                return false;
                            }
                        }
                        return true;
                    }
                }
                else {
                    const aObjectProperties = new Set(Object.getOwnPropertyNames(a));
                    const bObjectProperties = new Set(Object.getOwnPropertyNames(b));
                    if (aObjectProperties.size !== bObjectProperties.size) {
                        return false;
                    }
                    else {
                        for (const property of aObjectProperties) {
                            if (bObjectProperties.delete(property)) {
                                if (!areDeepEqual(a[property], b[property])) {
                                    return false;
                                }
                            }
                            else {
                                return false;
                            }
                        }
                        return bObjectProperties.size === 0;
                    }
                }
            }
            else {
                return false;
            }
        }
    }
}
//# sourceMappingURL=areDeepEqual.js.map