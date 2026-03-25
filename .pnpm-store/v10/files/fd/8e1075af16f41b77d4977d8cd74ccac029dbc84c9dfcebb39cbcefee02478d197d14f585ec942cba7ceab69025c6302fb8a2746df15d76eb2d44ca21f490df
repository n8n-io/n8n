export = asPromise;

type asPromiseCallback = (error: Error | null, ...params: any[]) => {};

/**
 * Returns a promise from a node-style callback function.
 * @memberof util
 * @param {asPromiseCallback} fn Function to call
 * @param {*} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
declare function asPromise(fn: asPromiseCallback, ctx: any, ...params: any[]): Promise<any>;
