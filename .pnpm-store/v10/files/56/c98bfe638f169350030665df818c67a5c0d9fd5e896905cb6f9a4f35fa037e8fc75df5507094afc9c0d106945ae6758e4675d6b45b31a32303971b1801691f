import type * as ts from 'typescript';
import type { VueCompilerOptions, TextRange } from '../types';
export interface ScriptSetupRanges extends ReturnType<typeof parseScriptSetupRanges> {
}
export declare function parseScriptSetupRanges(ts: typeof import('typescript'), ast: ts.SourceFile, vueCompilerOptions: VueCompilerOptions): {
    leadingCommentEndOffset: number;
    importSectionEndOffset: number;
    bindings: TextRange[];
    importComponentNames: Set<string>;
    props: {
        name?: string;
        destructured?: Set<string>;
        destructuredRest?: string;
        define?: ReturnType<(node: ts.CallExpression) => TextRange & {
            exp: TextRange;
            arg?: TextRange;
            typeArg?: TextRange;
        }> & {
            statement: TextRange;
        };
        withDefaults?: TextRange & {
            arg?: TextRange;
        };
    };
    slots: {
        name?: string;
        isObjectBindingPattern?: boolean;
        define?: ReturnType<(node: ts.CallExpression) => TextRange & {
            exp: TextRange;
            arg?: TextRange;
            typeArg?: TextRange;
        }> & {
            statement: TextRange;
        };
    };
    emits: {
        name?: string;
        define?: ReturnType<(node: ts.CallExpression) => TextRange & {
            exp: TextRange;
            arg?: TextRange;
            typeArg?: TextRange;
        }> & {
            statement: TextRange;
            hasUnionTypeArg?: boolean;
        };
    };
    expose: {
        name?: string;
        define?: ReturnType<(node: ts.CallExpression) => TextRange & {
            exp: TextRange;
            arg?: TextRange;
            typeArg?: TextRange;
        }>;
    };
    options: {
        name?: string;
        inheritAttrs?: string;
    };
    cssModules: {
        define: ReturnType<(node: ts.CallExpression) => TextRange & {
            exp: TextRange;
            arg?: TextRange;
            typeArg?: TextRange;
        }>;
    }[];
    defineProp: {
        localName: TextRange | undefined;
        name: TextRange | undefined;
        type: TextRange | undefined;
        modifierType?: TextRange | undefined;
        runtimeType: TextRange | undefined;
        defaultValue: TextRange | undefined;
        required: boolean;
        isModel?: boolean;
    }[];
    templateRefs: {
        name?: string;
        define: ReturnType<(node: ts.CallExpression) => TextRange & {
            exp: TextRange;
            arg?: TextRange;
            typeArg?: TextRange;
        }>;
    }[];
};
export declare function parseBindingRanges(ts: typeof import('typescript'), sourceFile: ts.SourceFile): TextRange[];
export declare function findBindingVars(ts: typeof import('typescript'), left: ts.BindingName, sourceFile: ts.SourceFile): TextRange[];
export declare function getStartEnd(ts: typeof import('typescript'), node: ts.Node, sourceFile: ts.SourceFile): {
    start: number;
    end: number;
};
export declare function getNodeText(ts: typeof import('typescript'), node: ts.Node, sourceFile: ts.SourceFile): string;
