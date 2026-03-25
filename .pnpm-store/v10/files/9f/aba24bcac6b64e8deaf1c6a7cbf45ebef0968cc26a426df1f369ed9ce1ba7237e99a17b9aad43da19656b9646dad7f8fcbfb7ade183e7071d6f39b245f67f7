import type * as ts from 'typescript';
import type { TextRange, VueCompilerOptions } from '../types';
type CallExpressionRange = {
    callExp: TextRange;
    exp: TextRange;
    arg?: TextRange;
    typeArg?: TextRange;
};
type DefineProp = {
    localName?: TextRange;
    name?: TextRange;
    type?: TextRange;
    modifierType?: TextRange;
    runtimeType?: TextRange;
    defaultValue?: TextRange;
    required?: boolean;
    isModel?: boolean;
    comments?: TextRange;
    argNode?: ts.Expression;
};
type DefineProps = CallExpressionRange & {
    name?: string;
    destructured?: Map<string, ts.Expression | undefined>;
    destructuredRest?: string;
    statement: TextRange;
    argNode?: ts.Expression;
};
type WithDefaults = Omit<CallExpressionRange, 'typeArg'> & {
    argNode?: ts.Expression;
};
type DefineEmits = CallExpressionRange & {
    name?: string;
    hasUnionTypeArg?: boolean;
    statement: TextRange;
};
type DefineSlots = CallExpressionRange & {
    name?: string;
    statement: TextRange;
};
type DefineOptions = {
    name?: string;
    inheritAttrs?: string;
};
type UseTemplateRef = CallExpressionRange & {
    name?: string;
};
export interface ScriptSetupRanges extends ReturnType<typeof parseScriptSetupRanges> {
}
export declare function parseScriptSetupRanges(ts: typeof import('typescript'), ast: ts.SourceFile, vueCompilerOptions: VueCompilerOptions): {
    leadingCommentEndOffset: number;
    importSectionEndOffset: number;
    bindings: {
        range: TextRange;
        moduleName?: string;
        isDefaultImport?: boolean;
        isNamespace?: boolean;
    }[];
    defineProp: DefineProp[];
    defineProps: DefineProps | undefined;
    withDefaults: WithDefaults | undefined;
    defineEmits: DefineEmits | undefined;
    defineSlots: DefineSlots | undefined;
    defineExpose: CallExpressionRange | undefined;
    defineOptions: DefineOptions | undefined;
    useAttrs: CallExpressionRange[];
    useCssModule: CallExpressionRange[];
    useSlots: CallExpressionRange[];
    useTemplateRef: UseTemplateRef[];
};
export declare function parseBindingRanges(ts: typeof import('typescript'), ast: ts.SourceFile): {
    range: TextRange;
    moduleName?: string;
    isDefaultImport?: boolean;
    isNamespace?: boolean;
}[];
export declare function findBindingVars(ts: typeof import('typescript'), left: ts.BindingName, ast: ts.SourceFile): TextRange[];
export declare function getStartEnd(ts: typeof import('typescript'), node: ts.Node, ast: ts.SourceFile): TextRange;
export declare function getNodeText(ts: typeof import('typescript'), node: ts.Node, ast: ts.SourceFile): string;
export {};
