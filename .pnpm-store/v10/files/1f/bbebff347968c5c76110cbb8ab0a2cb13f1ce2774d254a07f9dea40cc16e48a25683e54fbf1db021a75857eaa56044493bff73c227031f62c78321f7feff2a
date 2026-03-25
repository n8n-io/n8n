import { ImportedVariableSet } from './resolveRequired';
/**
 * Recursively resolves specified variables to their actual files
 * Useful when using intermediary files like this
 *
 * ```js
 * export mixin from "path/to/mixin"
 * ```
 *
 * @param pathResolver function to resolve relative to absolute path
 * @param varToFilePath set of variables to be resolved (will be mutated into the final mapping)
 */
export default function recursiveResolveIEV(pathResolver: (path: string, originalDirNameOverride?: string) => string | null, varToFilePath: ImportedVariableSet, validExtends: (fullFilePath: string) => boolean): Promise<void>;
/**
 * Resolves specified variables to their actual files
 * Useful when using intermediary files like this
 *
 * ```js
 * export mixin from "path/to/mixin"
 * export * from "path/to/another/mixin"
 * ```
 *
 * @param pathResolver function to resolve relative to absolute path
 * @param varToFilePath set of variables to be resolved (will be mutated into the final mapping)
 */
export declare function resolveIEV(pathResolver: (path: string, originalDirNameOverride?: string) => string | null, varToFilePath: ImportedVariableSet, validExtends: (fullFilePath: string) => boolean): Promise<void>;
