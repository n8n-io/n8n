/**
 * Resolve vitest ESM module from correct workspace
 * This is necessary for monorepos where langsmith is hoisted to
 * the top level of the monorepo but Vitest is not.
 * This can occur if you have multiple versions of vitest installed in the monorepo
 * and there is only one shared, hoisted version of langsmith.
 */
export declare const importVitestModule: (entrypoint?: string) => Promise<any>;
