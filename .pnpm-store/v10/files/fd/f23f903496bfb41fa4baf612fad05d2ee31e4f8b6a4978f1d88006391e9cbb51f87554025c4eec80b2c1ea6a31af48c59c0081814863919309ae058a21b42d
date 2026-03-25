/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IncomingHttpHeaders } from "http";

export class LinearRetryStrategy {
    /**
     * Calculates the number of milliseconds to sleep based on the `retry-after` HTTP header.
     *
     * @param retryHeader - The value of the `retry-after` HTTP header. This can be either a number of seconds
     *                      or an HTTP date string.
     * @returns The number of milliseconds to sleep before retrying the request. If the `retry-after` header is not
     *          present or cannot be parsed, returns 0.
     */
    public calculateDelay(
        retryHeader: IncomingHttpHeaders["retry-after"],
        minimumDelay: number
    ): number {
        if (!retryHeader) {
            return minimumDelay;
        }

        // retry-after header is in seconds
        let millisToSleep = Math.round(parseFloat(retryHeader) * 1000);

        /*
         * retry-after header is in HTTP Date format
         * <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
         */
        if (isNaN(millisToSleep)) {
            // .valueOf() is needed to subtract dates in TypeScript
            millisToSleep =
                new Date(retryHeader).valueOf() - new Date().valueOf();
        }

        return Math.max(minimumDelay, millisToSleep);
    }
}
