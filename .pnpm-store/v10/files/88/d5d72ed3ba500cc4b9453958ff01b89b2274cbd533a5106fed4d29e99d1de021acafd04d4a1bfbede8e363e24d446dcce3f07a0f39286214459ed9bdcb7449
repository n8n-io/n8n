import type { TextRange } from '../types';
import type * as ts from 'typescript';
export interface ScriptRanges extends ReturnType<typeof parseScriptRanges> {
}
export declare function parseScriptRanges(ts: typeof import('typescript'), ast: ts.SourceFile, hasScriptSetup: boolean, withNode: boolean): {
    exportDefault: (TextRange & {
        expression: TextRange;
        args: TextRange;
        argsNode: ts.ObjectLiteralExpression | undefined;
        componentsOption: TextRange | undefined;
        componentsOptionNode: ts.ObjectLiteralExpression | undefined;
        directivesOption: TextRange | undefined;
        nameOption: TextRange | undefined;
        inheritAttrsOption: string | undefined;
    }) | undefined;
    classBlockEnd: number | undefined;
    bindings: TextRange[];
};
