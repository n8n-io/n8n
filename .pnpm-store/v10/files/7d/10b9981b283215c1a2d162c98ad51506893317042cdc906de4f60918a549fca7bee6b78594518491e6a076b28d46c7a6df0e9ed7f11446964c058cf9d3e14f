import type { UtilBeanCollection } from '../interfaces/agCoreBeanCollection';
/**
 * If the key was passed before, then doesn't execute the func
 * @param {Function} func
 * @param {string} key
 */
export declare function _doOnce(func: () => void, key: string): void;
export declare function _batchCall(func: () => void): void;
export declare function _batchCall(func: () => void, mode: 'raf', beans: UtilBeanCollection): void;
/**
 * Creates a debounced function a function, and attach it to a bean for lifecycle
 * @param {Function} func The function to be debounced
 * @param {number} delay The time in ms to debounce
 * @returns {Function} The debounced function
 */
export declare function _debounce<TArgs extends any[], TContext>(bean: {
    isAlive(): boolean;
}, func: (this: TContext, ...args: TArgs) => void, delay: number): (this: TContext, ...args: TArgs) => void;
/**
 * @param {Function} func The function to be throttled
 * @param {number} wait The time in ms to throttle
 * @returns {Function} The throttled function
 */
export declare function _throttle(func: (...args: any[]) => void, wait: number): (...args: any[]) => void;
export declare function _waitUntil(bean: {
    addDestroyFunc(func: () => void): void;
}, condition: () => boolean, callback: () => void, timeout?: number): void;
