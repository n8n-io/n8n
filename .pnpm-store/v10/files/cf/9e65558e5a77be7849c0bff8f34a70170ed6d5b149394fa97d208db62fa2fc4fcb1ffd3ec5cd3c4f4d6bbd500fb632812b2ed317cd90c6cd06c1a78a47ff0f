import type * as CompilerDOM from '@vue/compiler-dom';
import type { Code, VueCodeInformation } from '../../types';
import { InlayHintInfo } from '../inlayHints';
import type { TemplateCodegenOptions } from './index';
export type TemplateCodegenContext = ReturnType<typeof createTemplateCodegenContext>;
export declare function createTemplateCodegenContext(options: Pick<TemplateCodegenOptions, 'scriptSetupBindingNames' | 'edited'>): {
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
        all: VueCodeInformation;
        verification: VueCodeInformation;
        completion: VueCodeInformation;
        additionalCompletion: VueCodeInformation;
        navigation: VueCodeInformation;
        navigationWithoutRename: VueCodeInformation;
        navigationAndCompletion: VueCodeInformation;
        navigationAndAdditionalCompletion: VueCodeInformation;
        withoutNavigation: VueCodeInformation;
        withoutHighlight: VueCodeInformation;
        withoutHighlightAndCompletion: VueCodeInformation;
        withoutHighlightAndCompletionAndNavigation: VueCodeInformation;
    };
    accessExternalVariables: Map<string, Set<number>>;
    lastGenericComment: {
        content: string;
        offset: number;
    } | undefined;
    hasSlotElements: Set<CompilerDOM.ElementNode>;
    blockConditions: string[];
    scopedClasses: {
        source: string;
        className: string;
        offset: number;
    }[];
    emptyClassOffsets: number[];
    inlayHints: InlayHintInfo[];
    hasSlot: boolean;
    bindingAttrLocs: CompilerDOM.SourceLocation[];
    inheritedAttrVars: Set<string>;
    templateRefs: Map<string, [varName: string, offset: number]>;
    currentComponent: {
        node: CompilerDOM.ElementNode;
        ctxVar: string;
        used: boolean;
    } | undefined;
    singleRootElType: string | undefined;
    singleRootNode: CompilerDOM.ElementNode | undefined;
    accessExternalVariable(name: string, offset?: number): void;
    hasLocalVariable: (name: string) => boolean;
    addLocalVariable: (name: string) => void;
    removeLocalVariable: (name: string) => void;
    getInternalVariable: () => string;
    ignoreError: () => Generator<Code>;
    expectError: (prevNode: CompilerDOM.CommentNode) => Generator<Code>;
    resetDirectiveComments: (endStr: string) => Generator<Code>;
    generateAutoImportCompletion: () => Generator<Code>;
};
