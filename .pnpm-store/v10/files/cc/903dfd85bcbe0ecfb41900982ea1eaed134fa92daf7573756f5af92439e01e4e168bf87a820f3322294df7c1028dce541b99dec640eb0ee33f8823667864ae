"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.minDeadline = minDeadline;
exports.getDeadlineTimeoutString = getDeadlineTimeoutString;
exports.getRelativeTimeout = getRelativeTimeout;
exports.deadlineToString = deadlineToString;
exports.formatDateDifference = formatDateDifference;
function minDeadline(...deadlineList) {
    let minValue = Infinity;
    for (const deadline of deadlineList) {
        const deadlineMsecs = deadline instanceof Date ? deadline.getTime() : deadline;
        if (deadlineMsecs < minValue) {
            minValue = deadlineMsecs;
        }
    }
    return minValue;
}
const units = [
    ['m', 1],
    ['S', 1000],
    ['M', 60 * 1000],
    ['H', 60 * 60 * 1000],
];
function getDeadlineTimeoutString(deadline) {
    const now = new Date().getTime();
    if (deadline instanceof Date) {
        deadline = deadline.getTime();
    }
    const timeoutMs = Math.max(deadline - now, 0);
    for (const [unit, factor] of units) {
        const amount = timeoutMs / factor;
        if (amount < 1e8) {
            return String(Math.ceil(amount)) + unit;
        }
    }
    throw new Error('Deadline is too far in the future');
}
/**
 * See https://nodejs.org/api/timers.html#settimeoutcallback-delay-args
 * In particular, "When delay is larger than 2147483647 or less than 1, the
 * delay will be set to 1. Non-integer delays are truncated to an integer."
 * This number of milliseconds is almost 25 days.
 */
const MAX_TIMEOUT_TIME = 2147483647;
/**
 * Get the timeout value that should be passed to setTimeout now for the timer
 * to end at the deadline. For any deadline before now, the timer should end
 * immediately, represented by a value of 0. For any deadline more than
 * MAX_TIMEOUT_TIME milliseconds in the future, a timer cannot be set that will
 * end at that time, so it is treated as infinitely far in the future.
 * @param deadline
 * @returns
 */
function getRelativeTimeout(deadline) {
    const deadlineMs = deadline instanceof Date ? deadline.getTime() : deadline;
    const now = new Date().getTime();
    const timeout = deadlineMs - now;
    if (timeout < 0) {
        return 0;
    }
    else if (timeout > MAX_TIMEOUT_TIME) {
        return Infinity;
    }
    else {
        return timeout;
    }
}
function deadlineToString(deadline) {
    if (deadline instanceof Date) {
        return deadline.toISOString();
    }
    else {
        const dateDeadline = new Date(deadline);
        if (Number.isNaN(dateDeadline.getTime())) {
            return '' + deadline;
        }
        else {
            return dateDeadline.toISOString();
        }
    }
}
/**
 * Calculate the difference between two dates as a number of seconds and format
 * it as a string.
 * @param startDate
 * @param endDate
 * @returns
 */
function formatDateDifference(startDate, endDate) {
    return ((endDate.getTime() - startDate.getTime()) / 1000).toFixed(3) + 's';
}
//# sourceMappingURL=deadline.js.map