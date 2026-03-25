/// <reference types="node" />

export * from "fs";

/**
 * Use this method to patch the global fs module (or any other fs-like module).
 * NOTE: This should only ever be done at the top-level application layer, in order to delay on
 * EMFILE errors from any fs-using dependencies. You should **not** do this in a library, because
 * it can cause unexpected delays in other parts of the program.
 * @param fsModule The reference to the fs module or an fs-like module.
 */
export function gracefulify<T>(fsModule: T): T;
