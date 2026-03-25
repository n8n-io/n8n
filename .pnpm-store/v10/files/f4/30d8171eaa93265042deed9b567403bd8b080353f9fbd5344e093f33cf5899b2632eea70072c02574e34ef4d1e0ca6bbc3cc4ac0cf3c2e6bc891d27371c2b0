import type { Mapping } from '@volar/language-core';
import type { Code, Sfc, VueLanguagePlugin } from '../types';
export declare const tsCodegen: WeakMap<Sfc, {
    scriptRanges: import("alien-signals").Computed<{
        exportDefault: (import("../types").TextRange & {
            expression: import("../types").TextRange;
            args: import("../types").TextRange;
            argsNode: import("typescript").ObjectLiteralExpression | undefined;
            componentsOption: import("../types").TextRange | undefined;
            componentsOptionNode: import("typescript").ObjectLiteralExpression | undefined;
            directivesOption: import("../types").TextRange | undefined;
            nameOption: import("../types").TextRange | undefined;
            inheritAttrsOption: string | undefined;
        }) | undefined;
        classBlockEnd: number | undefined;
        bindings: {
            range: import("../types").TextRange;
            moduleName?: string;
            isDefaultImport?: boolean;
            isNamespace?: boolean;
        }[];
    } | undefined>;
    scriptSetupRanges: import("alien-signals").Computed<{
        leadingCommentEndOffset: number;
        importSectionEndOffset: number;
        bindings: {
            range: import("../types").TextRange;
            moduleName?: string;
            isDefaultImport?: boolean;
            isNamespace?: boolean;
        }[];
        defineProp: {
            localName?: import("../types").TextRange;
            name?: import("../types").TextRange;
            type?: import("../types").TextRange;
            modifierType?: import("../types").TextRange;
            runtimeType?: import("../types").TextRange;
            defaultValue?: import("../types").TextRange;
            required?: boolean;
            isModel?: boolean;
        }[];
        defineProps: ({
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        } & {
            name?: string;
            destructured?: Set<string>;
            destructuredRest?: string;
            statement: import("../types").TextRange;
        }) | undefined;
        withDefaults: {
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange | undefined;
        } | undefined;
        defineEmits: ({
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        } & {
            name?: string;
            hasUnionTypeArg?: boolean;
            statement: import("../types").TextRange;
        }) | undefined;
        defineSlots: ({
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        } & {
            name?: string;
            isObjectBindingPattern?: boolean;
            statement: import("../types").TextRange;
        }) | undefined;
        defineExpose: {
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        } | undefined;
        defineOptions: {
            name?: string;
            inheritAttrs?: string;
        } | undefined;
        useAttrs: {
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        }[];
        useCssModule: {
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        }[];
        useSlots: {
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        }[];
        useTemplateRef: ({
            callExp: import("../types").TextRange;
            exp: import("../types").TextRange;
            arg?: import("../types").TextRange;
            typeArg?: import("../types").TextRange;
        } & {
            name?: string;
        })[];
    } | undefined>;
    lang: import("alien-signals").Computed<string>;
    generatedScript: import("alien-signals").Computed<{
        codes: Code[];
        linkedCodeMappings: Mapping<unknown>[];
        generatedTemplate: boolean;
        generatedPropsType: boolean;
        scriptSetupGeneratedOffset: number | undefined;
        bypassDefineComponent: boolean;
        bindingNames: Set<string>;
        localTypes: {
            generate: (names: string[]) => Generator<string, void, unknown>;
            getUsedNames(): Set<string>;
            readonly PrettifyLocal: string;
            readonly OmitKeepDiscriminatedUnion: string;
            readonly WithDefaults: string;
            readonly WithTemplateSlots: string;
            readonly PropsChildren: string;
            readonly TypePropsToOption: string;
            readonly OmitIndexSignature: string;
        };
        inlayHints: import("../codegen/inlayHints").InlayHintInfo[];
    }>;
    generatedTemplate: import("alien-signals").Computed<{
        codes: Code[];
        slots: {
            name: string;
            loc?: number;
            tagRange: [number, number];
            varName: string;
            nodeLoc: any;
        }[];
        dynamicSlots: {
            expVar: string;
            varName: string;
        }[];
        codeFeatures: {
            all: import("../types").VueCodeInformation;
            verification: import("../types").VueCodeInformation;
            completion: import("../types").VueCodeInformation;
            additionalCompletion: import("../types").VueCodeInformation;
            navigation: import("../types").VueCodeInformation;
            navigationWithoutRename: import("../types").VueCodeInformation;
            navigationAndCompletion: import("../types").VueCodeInformation;
            navigationAndAdditionalCompletion: import("../types").VueCodeInformation;
            withoutNavigation: import("../types").VueCodeInformation;
            withoutHighlight: import("../types").VueCodeInformation;
            withoutHighlightAndCompletion: import("../types").VueCodeInformation;
            withoutHighlightAndCompletionAndNavigation: import("../types").VueCodeInformation;
        };
        accessExternalVariables: Map<string, Set<number>>;
        lastGenericComment: {
            content: string;
            offset: number;
        } | undefined;
        hasSlotElements: Set<import("@vue/compiler-dom").ElementNode>;
        blockConditions: string[];
        scopedClasses: {
            source: string;
            className: string;
            offset: number;
        }[];
        emptyClassOffsets: number[];
        inlayHints: import("../codegen/inlayHints").InlayHintInfo[];
        hasSlot: boolean;
        bindingAttrLocs: import("@vue/compiler-dom").SourceLocation[];
        inheritedAttrVars: Set<string>;
        templateRefs: Map<string, [varName: string, offset: number]>;
        currentComponent: {
            node: import("@vue/compiler-dom").ElementNode;
            ctxVar: string;
            used: boolean;
        } | undefined;
        singleRootElType: string | undefined;
        singleRootNode: import("@vue/compiler-dom").ElementNode | undefined;
        accessExternalVariable(name: string, offset?: number): void;
        hasLocalVariable: (name: string) => boolean;
        addLocalVariable: (name: string) => void;
        removeLocalVariable: (name: string) => void;
        getInternalVariable: () => string;
        ignoreError: () => Generator<Code>;
        expectError: (prevNode: import("@vue/compiler-dom").CommentNode) => Generator<Code>;
        resetDirectiveComments: (endStr: string) => Generator<Code>;
        generateAutoImportCompletion: () => Generator<Code>;
    } | undefined>;
}>;
declare const plugin: VueLanguagePlugin;
export default plugin;
