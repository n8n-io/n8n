import { AstNamespaceImport, type IAstNamespaceImportOptions } from './AstNamespaceImport';
export interface IAstNamespaceExportOptions extends IAstNamespaceImportOptions {
}
/**
 * `AstNamespaceExport` represents a namespace that is created implicitly and exported by a statement
 * such as `export * as example from "./file";`
 *
 * @remarks
 *
 * A typical input looks like this:
 * ```ts
 * // Suppose that example.ts exports two functions f1() and f2().
 * export * as example from "./file";
 * ```
 *
 * API Extractor's .d.ts rollup will transform it into an explicit namespace, like this:
 * ```ts
 * declare f1(): void;
 * declare f2(): void;
 *
 * export declare namespace example {
 *   export {
 *     f1,
 *     f2
 *   }
 * }
 * ```
 *
 * The current implementation does not attempt to relocate f1()/f2() to be inside the `namespace`
 * because other type signatures may reference them directly (without using the namespace qualifier).
 * The AstNamespaceExports behaves the same as AstNamespaceImport, it just also has the inline export for the craeted namespace.
 */
export declare class AstNamespaceExport extends AstNamespaceImport {
    constructor(options: IAstNamespaceExportOptions);
}
//# sourceMappingURL=AstNamespaceExport.d.ts.map