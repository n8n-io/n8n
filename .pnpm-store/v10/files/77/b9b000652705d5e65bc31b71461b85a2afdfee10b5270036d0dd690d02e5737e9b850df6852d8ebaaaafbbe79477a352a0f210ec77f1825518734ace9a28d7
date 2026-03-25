// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isObject } from "./object.js";
/**
 * Typeguard for an error object shape (has name and message)
 * @param e - Something caught by a catch clause.
 */
export function isError(e) {
    if (isObject(e)) {
        const hasName = typeof e.name === "string";
        const hasMessage = typeof e.message === "string";
        return hasName && hasMessage;
    }
    return false;
}
//# sourceMappingURL=error.js.map