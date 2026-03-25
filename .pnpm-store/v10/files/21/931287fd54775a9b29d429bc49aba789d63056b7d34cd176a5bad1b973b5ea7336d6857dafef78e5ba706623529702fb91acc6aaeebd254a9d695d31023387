export interface PromisifyAllOptions extends PromisifyOptions {
    /**
     * Array of methods to ignore when promisifying.
     */
    exclude?: string[];
}
export interface PromisifyOptions {
    /**
     * Resolve the promise with single arg instead of an array.
     */
    singular?: boolean;
}
export interface PromiseMethod extends Function {
    promisified_?: boolean;
}
export interface WithPromise {
    Promise?: PromiseConstructor;
}
export interface CallbackifyAllOptions {
    /**
     * Array of methods to ignore when callbackifying.
     */
    exclude?: string[];
}
export interface CallbackMethod extends Function {
    callbackified_?: boolean;
}
/**
 * Wraps a callback style function to conditionally return a promise.
 *
 * @param {function} originalMethod - The method to promisify.
 * @param {object=} options - Promise options.
 * @param {boolean} options.singular - Resolve the promise with single arg instead of an array.
 * @return {function} wrapped
 */
export declare function promisify(originalMethod: PromiseMethod, options?: PromisifyOptions): any;
/**
 * Promisifies certain Class methods. This will not promisify private or
 * streaming methods.
 *
 * @param {module:common/service} Class - Service class.
 * @param {object=} options - Configuration object.
 */
export declare function promisifyAll(Class: Function, options?: PromisifyAllOptions): void;
/**
 * Wraps a promisy type function to conditionally call a callback function.
 *
 * @param {function} originalMethod - The method to callbackify.
 * @param {object=} options - Callback options.
 * @param {boolean} options.singular - Pass to the callback a single arg instead of an array.
 * @return {function} wrapped
 */
export declare function callbackify(originalMethod: CallbackMethod): CallbackMethod;
/**
 * Callbackifies certain Class methods. This will not callbackify private or
 * streaming methods.
 *
 * @param {module:common/service} Class - Service class.
 * @param {object=} options - Configuration object.
 */
export declare function callbackifyAll(Class: Function, options?: CallbackifyAllOptions): void;
