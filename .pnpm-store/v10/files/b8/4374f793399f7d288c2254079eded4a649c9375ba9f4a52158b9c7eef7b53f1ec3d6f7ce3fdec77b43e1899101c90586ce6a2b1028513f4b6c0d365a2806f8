/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * @internal
 * Checks if a given date string is in ISO 8601 format.
 *
 * @param dateString - The date string to be checked.
 * @returns boolean - Returns true if the date string is in ISO 8601 format, otherwise false.
 */
function isIso8601(dateString) {
    if (typeof dateString !== "string") {
        return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString() === dateString;
}

export { isIso8601 };
//# sourceMappingURL=TimeUtils.mjs.map
