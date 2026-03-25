export type Deadline = Date | number;
export declare function minDeadline(...deadlineList: Deadline[]): Deadline;
export declare function getDeadlineTimeoutString(deadline: Deadline): string;
/**
 * Get the timeout value that should be passed to setTimeout now for the timer
 * to end at the deadline. For any deadline before now, the timer should end
 * immediately, represented by a value of 0. For any deadline more than
 * MAX_TIMEOUT_TIME milliseconds in the future, a timer cannot be set that will
 * end at that time, so it is treated as infinitely far in the future.
 * @param deadline
 * @returns
 */
export declare function getRelativeTimeout(deadline: Deadline): number;
export declare function deadlineToString(deadline: Deadline): string;
/**
 * Calculate the difference between two dates as a number of seconds and format
 * it as a string.
 * @param startDate
 * @param endDate
 * @returns
 */
export declare function formatDateDifference(startDate: Date, endDate: Date): string;
