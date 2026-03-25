/**
 *  This module provides setInterval, setTimeout and co.
 */

/**
 * Set a timer that executes a function once the timer expires.
 *
 * @param functionRef - The function to be executed.
 * @param delay - The delay in milliseconds.
 * @param args - The arguments to be passed to the function.
 * @returns The timer id.
 */
export function setTimeout(functionRef: (...args: any[]) => void, delay: number, ...args: any[]): TimeoutID;

/**
 * Cancels a timer previously set with setTimeout().
 *
 * @param timeoutID - The timer id to be cancelled.
 */
export function clearTimeout(timeoutID: TimeoutID): void;

/**
 * Repeatedly execute a function, with a fixed time delay between each call.
 *
 * @param functionRef - The function to be executed.
 * @param delay - The delay in milliseconds.
 * @param args - The arguments to be passed to the function.
 * @returns The interval id.
 */
export function setInterval(functionRef: (...args: any[]) => void, delay: number, ...args: any[]): IntervalID;

/**
 * Cancels an interval previously set with setInterval().
 *
 * @param intervalID - The interval id to be cancelled.
 */
export function clearInterval(intervalID: IntervalID): void;

/**
 * Type alias for a timer id.
 */
export type TimeoutID = number;

/**
 * Type alias for a interval id.
 */
export type IntervalID = number;
