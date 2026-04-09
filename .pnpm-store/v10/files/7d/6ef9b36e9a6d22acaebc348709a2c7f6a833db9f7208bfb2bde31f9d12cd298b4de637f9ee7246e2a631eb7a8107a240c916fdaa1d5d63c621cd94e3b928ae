import * as ts from 'typescript';
import type { CollectorEntity } from '../collector/CollectorEntity';
import { AstImport } from '../analyzer/AstImport';
import { AstDeclaration } from '../analyzer/AstDeclaration';
import type { Collector } from '../collector/Collector';
import type { Span } from '../analyzer/Span';
import type { IndentedWriter } from './IndentedWriter';
/**
 * Some common code shared between DtsRollupGenerator and ApiReportGenerator.
 */
export declare class DtsEmitHelpers {
    static emitImport(writer: IndentedWriter, collectorEntity: CollectorEntity, astImport: AstImport): void;
    static emitNamedExport(writer: IndentedWriter, exportName: string, collectorEntity: CollectorEntity): void;
    static emitStarExports(writer: IndentedWriter, collector: Collector): void;
    static modifyImportTypeSpan(collector: Collector, span: Span, astDeclaration: AstDeclaration, modifyNestedSpan: (childSpan: Span, childAstDeclaration: AstDeclaration) => void): void;
    /**
     * Checks if an export keyword is part of an ExportDeclaration inside a namespace
     * (e.g., "export { Foo, Bar };" inside "declare namespace SDK { ... }").
     * In that case, the export keyword must be preserved, otherwise the output is invalid TypeScript.
     */
    static isExportKeywordInNamespaceExportDeclaration(node: ts.Node): boolean;
    /**
     * Given an array that includes some parameter nodes, this returns an array of the same length;
     * elements that are not undefined correspond to a parameter that should be renamed.
     */
    static forEachParameterToNormalize(nodes: ArrayLike<ts.Node>, action: (parameter: ts.ParameterDeclaration, syntheticName: string | undefined) => void): void;
    static normalizeParameterNames(signatureSpan: Span): void;
}
//# sourceMappingURL=DtsEmitHelpers.d.ts.map