import type { CodeInformation } from '@volar/language-core';
import type * as CompilerDOM from '@vue/compiler-dom';
import type { SFCParseResult } from '@vue/compiler-sfc';
import type { Segment } from 'muggle-string';
import type * as ts from 'typescript';
import type { VueEmbeddedCode } from './virtualFile/embeddedFile';
export type { SFCParseResult } from '@vue/compiler-sfc';
export { VueEmbeddedCode };
export type RawVueCompilerOptions = Partial<Omit<VueCompilerOptions, 'target' | 'plugins'>> & {
    strictTemplates?: boolean;
    target?: 'auto' | 2 | 2.7 | 3 | 3.3 | 3.5 | 99 | number;
    plugins?: string[];
};
export interface VueCodeInformation extends CodeInformation {
    __combineOffset?: number;
    __linkedToken?: symbol;
}
export type Code = Segment<VueCodeInformation>;
export interface VueCompilerOptions {
    target: number;
    lib: string;
    extensions: string[];
    vitePressExtensions: string[];
    petiteVueExtensions: string[];
    jsxSlots: boolean;
    checkUnknownProps: boolean;
    checkUnknownEvents: boolean;
    checkUnknownDirectives: boolean;
    checkUnknownComponents: boolean;
    inferComponentDollarEl: boolean;
    inferComponentDollarRefs: boolean;
    inferTemplateDollarAttrs: boolean;
    inferTemplateDollarEl: boolean;
    inferTemplateDollarRefs: boolean;
    inferTemplateDollarSlots: boolean;
    skipTemplateCodegen: boolean;
    fallthroughAttributes: boolean;
    fallthroughComponentNames: string[];
    dataAttributes: string[];
    htmlAttributes: string[];
    optionsWrapper: [string, string] | [];
    macros: {
        defineProps: string[];
        defineSlots: string[];
        defineEmits: string[];
        defineExpose: string[];
        defineModel: string[];
        defineOptions: string[];
        withDefaults: string[];
    };
    composables: {
        useAttrs: string[];
        useCssModule: string[];
        useSlots: string[];
        useTemplateRef: string[];
    };
    plugins: VueLanguagePlugin[];
    experimentalDefinePropProposal: 'kevinEdition' | 'johnsonEdition' | false;
    experimentalResolveStyleCssClasses: 'scoped' | 'always' | 'never';
    experimentalModelPropName: Record<string, Record<string, boolean | Record<string, string> | Record<string, string>[]>>;
    __setupedGlobalTypes?: true | {
        absolutePath: string;
    };
    __test?: boolean;
}
export declare const validVersions: readonly [2, 2.1];
export type VueLanguagePluginReturn = {
    version: typeof validVersions[number];
    name?: string;
    order?: number;
    requiredCompilerOptions?: string[];
    getLanguageId?(fileName: string): string | undefined;
    isValidFile?(fileName: string, languageId: string): boolean;
    parseSFC?(fileName: string, content: string): SFCParseResult | undefined;
    parseSFC2?(fileName: string, languageId: string, content: string): SFCParseResult | undefined;
    updateSFC?(oldResult: SFCParseResult, textChange: {
        start: number;
        end: number;
        newText: string;
    }): SFCParseResult | undefined;
    resolveTemplateCompilerOptions?(options: CompilerDOM.CompilerOptions): CompilerDOM.CompilerOptions;
    compileSFCScript?(lang: string, script: string): ts.SourceFile | undefined;
    compileSFCTemplate?(lang: string, template: string, options: CompilerDOM.CompilerOptions): CompilerDOM.CodegenResult | undefined;
    updateSFCTemplate?(oldResult: CompilerDOM.CodegenResult, textChange: {
        start: number;
        end: number;
        newText: string;
    }): CompilerDOM.CodegenResult | undefined;
    getEmbeddedCodes?(fileName: string, sfc: Sfc): {
        id: string;
        lang: string;
    }[];
    resolveEmbeddedCode?(fileName: string, sfc: Sfc, embeddedFile: VueEmbeddedCode): void;
};
export type VueLanguagePlugin = (ctx: {
    modules: {
        typescript: typeof ts;
        '@vue/compiler-dom': typeof CompilerDOM;
    };
    compilerOptions: ts.CompilerOptions;
    vueCompilerOptions: VueCompilerOptions;
}) => VueLanguagePluginReturn | VueLanguagePluginReturn[];
export interface SfcBlock {
    name: string;
    start: number;
    end: number;
    startTagEnd: number;
    endTagStart: number;
    lang: string;
    content: string;
    attrs: Record<string, string | true>;
}
export type SfcBlockAttr = true | {
    text: string;
    offset: number;
    quotes: boolean;
};
export interface Sfc {
    content: string;
    comments: string[];
    template: SfcBlock & {
        ast: CompilerDOM.RootNode | undefined;
        errors: CompilerDOM.CompilerError[];
        warnings: CompilerDOM.CompilerError[];
    } | undefined;
    script: (SfcBlock & {
        src: SfcBlockAttr | undefined;
        ast: ts.SourceFile;
    }) | undefined;
    scriptSetup: SfcBlock & {
        generic: SfcBlockAttr | undefined;
        ast: ts.SourceFile;
    } | undefined;
    styles: readonly (SfcBlock & {
        scoped: boolean;
        module?: SfcBlockAttr | undefined;
        cssVars: {
            text: string;
            offset: number;
        }[];
        classNames: {
            text: string;
            offset: number;
        }[];
    })[];
    customBlocks: readonly (SfcBlock & {
        type: string;
    })[];
}
declare module '@vue/compiler-sfc' {
    interface SFCBlock {
        __src?: SfcBlockAttr;
    }
    interface SFCScriptBlock {
        __generic?: SfcBlockAttr;
    }
    interface SFCStyleBlock {
        __module?: SfcBlockAttr;
    }
}
export interface TextRange {
    start: number;
    end: number;
}
