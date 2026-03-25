import type * as CompilerDOM from '@vue/compiler-dom';
import type { Code, VueCodeInformation } from '../../types';
import { InlayHintInfo } from '../inlayHints';
import type { TemplateCodegenOptions } from './index';
export type TemplateCodegenContext = ReturnType<typeof createTemplateCodegenContext>;
/**
 * Creates and returns a Context object used for generating type-checkable TS code
 * from the template section of a .vue file.
 *
 * ## Implementation Notes for supporting `@vue-ignore`, `@vue-expect-error`, and `@vue-skip` directives.
 *
 * Vue language tooling supports a number of directives for suppressing diagnostics within
 * Vue templates (https://github.com/vuejs/language-tools/pull/3215)
 *
 * Here is an overview for how support for how @vue-expect-error is implemented within this file
 * (@vue-expect-error is the most complicated directive to support due to its behavior of raising
 * a diagnostic when it is annotating a piece of code that doesn't actually have any errors/warning/diagnostics).
 *
 * Given .vue code:
 *
 * ```vue
 *   <script setup lang="ts">
 *   defineProps<{
 *     knownProp1: string;
 *     knownProp2: string;
 *     knownProp3: string;
 *     knownProp4_will_trigger_unused_expect_error: string;
 *   }>();
 *   </script>
 *
 *   <template>
 *     {{ knownProp1 }}
 *     {{ error_unknownProp }} <!-- ERROR: Property 'error_unknownProp' does not exist on type [...] -->
 *     {{ knownProp2 }}
 *     <!-- @vue-expect-error This suppresses an Unknown Property Error -->
 *     {{ suppressed_error_unknownProp }}
 *     {{ knownProp3 }}
 *     <!-- @vue-expect-error This will trigger Unused '@ts-expect-error' directive.ts(2578) -->
 *     {{ knownProp4_will_trigger_unused_expect_error }}
 *   </template>
 * ```
 *
 * The above code should raise two diagnostics:
 *
 * 1. Property 'error_unknownProp' does not exist on type [...]
 * 2. Unused '@ts-expect-error' directive.ts(2578) -- this is the bottom `@vue-expect-error` directive
 *    that covers code that doesn't actually raise an error -- note that all `@vue-...` directives
 *    will ultimately translate into `@ts-...` diagnostics.
 *
 * The above code will produce the following type-checkable TS code (note: omitting asterisks
 * to prevent VSCode syntax double-greying out double-commented code).
 *
 * ```ts
 *   ( __VLS_ctx.knownProp1 );
 *   ( __VLS_ctx.error_unknownProp ); // ERROR: Property 'error_unknownProp' does not exist on type [...]
 *   ( __VLS_ctx.knownProp2 );
 *   // @vue-expect-error start
 *   ( __VLS_ctx.suppressed_error_unknownProp );
 *   // @ts-expect-error __VLS_TS_EXPECT_ERROR
 *   ;
 *   // @vue-expect-error end of INTERPOLATION
 *   ( __VLS_ctx.knownProp3 );
 *   // @vue-expect-error start
 *   ( __VLS_ctx.knownProp4_will_trigger_unused_expect_error );
 *   // @ts-expect-error __VLS_TS_EXPECT_ERROR
 *   ;
 *   // @vue-expect-error end of INTERPOLATION
 * ```
 *
 * In the generated code, there are actually 3 diagnostic errors that'll be raised in the first
 * pass on this generated code (but through cleverness described below, not all of them will be
 * propagated back to the original .vue file):
 *
 * 1. Property 'error_unknownProp' does not exist on type [...]
 * 2. Unused '@ts-expect-error' directive.ts(2578) from the 1st `@ts-expect-error __VLS_TS_EXPECT_ERROR`
 * 3. Unused '@ts-expect-error' directive.ts(2578) from the 2nd `@ts-expect-error __VLS_TS_EXPECT_ERROR`
 *
 * Be sure to pay careful attention to the mixture of `@vue-expect-error` and `@ts-expect-error`;
 * Within the TS file, the only "real" directives recognized by TS are going to be prefixed with `@ts-`;
 * any `@vue-` prefixed directives in the comments are only for debugging purposes.
 *
 * As mentioned above, there are 3 diagnostics errors that'll be generated for the above code, but
 * only 2 should be propagated back to the original .vue file.
 *
 * (The reason we structure things this way is somewhat complicated, but in short it allows us
 * to lean on TS as much as possible to generate actual `unused @ts-expect-error directive` errors
 * while covering a number of edge cases.)
 *
 * So, we need a way to dynamically decide whether each of the `@ts-expect-error __VLS_TS_EXPECT_ERROR`
 * directives should be reported as an unused directive or not.
 *
 * To do this, we'll make use of the `shouldReport` callback that'll optionally be provided to the
 * `verification` property of the `CodeInformation` object attached to the mapping between source .vue
 * and generated .ts code. The `verification` property determines whether "verification" (which includes
 * semantic diagnostics) should be performed on the generated .ts code, and `shouldReport`, if provided,
 * can be used to determine whether a given diagnostic should be reported back "upwards" to the original
 * .vue file or not.
 *
 * See the comments in the code below for how and where we use this hook to keep track of whether
 * an error/diagnostic was encountered for a region of code covered by a `@vue-expect-error` directive,
 * and additionally how we use that to determine whether to propagate diagnostics back upward.
 */
export declare function createTemplateCodegenContext(options: Pick<TemplateCodegenOptions, 'scriptSetupBindingNames' | 'edited'>): {
    codeFeatures: {
        all: VueCodeInformation;
        none: VueCodeInformation;
        verification: VueCodeInformation;
        completion: VueCodeInformation;
        additionalCompletion: VueCodeInformation;
        withoutCompletion: VueCodeInformation;
        navigation: VueCodeInformation;
        navigationWithoutRename: VueCodeInformation;
        navigationAndCompletion: VueCodeInformation;
        navigationAndAdditionalCompletion: VueCodeInformation;
        navigationAndVerification: VueCodeInformation;
        withoutNavigation: VueCodeInformation;
        withoutHighlight: VueCodeInformation;
        withoutHighlightAndNavigation: VueCodeInformation;
        withoutHighlightAndCompletion: VueCodeInformation;
        withoutHighlightAndCompletionAndNavigation: VueCodeInformation;
    };
    resolveCodeFeatures: (features: VueCodeInformation) => VueCodeInformation;
    slots: {
        name: string;
        offset?: number;
        tagRange: [number, number];
        nodeLoc: any;
        propsVar: string;
    }[];
    dynamicSlots: {
        expVar: string;
        propsVar: string;
    }[];
    dollarVars: Set<string>;
    accessExternalVariables: Map<string, Set<number>>;
    lastGenericComment: {
        content: string;
        offset: number;
    } | undefined;
    blockConditions: string[];
    scopedClasses: {
        source: string;
        className: string;
        offset: number;
    }[];
    emptyClassOffsets: number[];
    inlayHints: InlayHintInfo[];
    bindingAttrLocs: CompilerDOM.SourceLocation[];
    inheritedAttrVars: Set<string>;
    templateRefs: Map<string, {
        typeExp: string;
        offset: number;
    }>;
    currentComponent: {
        ctxVar: string;
        used: boolean;
    } | undefined;
    singleRootElTypes: string[];
    singleRootNodes: Set<CompilerDOM.ElementNode | null>;
    accessExternalVariable(name: string, offset?: number): void;
    hasLocalVariable: (name: string) => boolean;
    addLocalVariable: (name: string) => void;
    removeLocalVariable: (name: string) => void;
    getInternalVariable: () => string;
    getHoistVariable: (originalVar: string) => string;
    generateHoistVariables: () => Generator<string, void, unknown>;
    ignoreError: () => Generator<Code>;
    expectError: (prevNode: CompilerDOM.CommentNode) => Generator<Code>;
    resetDirectiveComments: (endStr: string) => Generator<Code>;
    generateAutoImportCompletion: () => Generator<Code>;
};
