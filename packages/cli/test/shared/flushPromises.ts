/**
 * Ensure all pending promises settle. The promise's `resolve` is placed in
 * the macrotask queue and so called at the next iteration of the event loop
 * after all promises in the microtask queue have settled first.
 */
export const flushPromises = async () => await new Promise(setImmediate);
