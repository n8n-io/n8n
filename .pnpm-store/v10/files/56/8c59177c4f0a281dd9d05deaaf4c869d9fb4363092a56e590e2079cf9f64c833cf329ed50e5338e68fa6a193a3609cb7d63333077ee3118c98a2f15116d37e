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
}
//# sourceMappingURL=DtsEmitHelpers.d.ts.map