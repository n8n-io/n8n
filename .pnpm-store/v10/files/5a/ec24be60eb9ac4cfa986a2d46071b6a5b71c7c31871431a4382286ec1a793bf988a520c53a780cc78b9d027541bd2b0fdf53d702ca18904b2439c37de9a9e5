import type * as ts from 'typescript';
import type { AstModule, IAstModuleExportInfo } from './AstModule';
import { AstSyntheticEntity } from './AstEntity';
import type { Collector } from '../collector/Collector';
export interface IAstNamespaceImportOptions {
    readonly astModule: AstModule;
    readonly namespaceName: string;
    readonly declaration: ts.Declaration;
    readonly symbol: ts.Symbol;
}
/**
 * `AstNamespaceImport` represents a namespace that is created implicitly by a statement
 * such as `import * as example from "./file";`
 *
 * @remarks
 *
 * A typical input looks like this:
 * ```ts
 * // Suppose that example.ts exports two functions f1() and f2().
 * import * as example from "./file";
 * export { example };
 * ```
 *
 * API Extractor's .d.ts rollup will transform it into an explicit namespace, like this:
 * ```ts
 * declare f1(): void;
 * declare f2(): void;
 *
 * declare namespace example {
 *   export {
 *     f1,
 *     f2
 *   }
 * }
 * ```
 *
 * The current implementation does not attempt to relocate f1()/f2() to be inside the `namespace`
 * because other type signatures may reference them directly (without using the namespace qualifier).
 * The `declare namespace example` is a synthetic construct represented by `AstNamespaceImport`.
 */
export declare class AstNamespaceImport extends AstSyntheticEntity {
    /**
     * Returns true if the AstSymbolTable.analyze() was called for this object.
     * See that function for details.
     */
    analyzed: boolean;
    /**
     * For example, if the original statement was `import * as example from "./file";`
     * then `astModule` refers to the `./file.d.ts` file.
     */
    readonly astModule: AstModule;
    /**
     * For example, if the original statement was `import * as example from "./file";`
     * then `namespaceName` would be `example`.
     */
    readonly namespaceName: string;
    /**
     * The original `ts.SyntaxKind.NamespaceImport` which can be used as a location for error messages.
     */
    readonly declaration: ts.Declaration;
    /**
     * The original `ts.SymbolFlags.Namespace` symbol.
     */
    readonly symbol: ts.Symbol;
    constructor(options: IAstNamespaceImportOptions);
    /** {@inheritdoc} */
    get localName(): string;
    fetchAstModuleExportInfo(collector: Collector): IAstModuleExportInfo;
}
//# sourceMappingURL=AstNamespaceImport.d.ts.map