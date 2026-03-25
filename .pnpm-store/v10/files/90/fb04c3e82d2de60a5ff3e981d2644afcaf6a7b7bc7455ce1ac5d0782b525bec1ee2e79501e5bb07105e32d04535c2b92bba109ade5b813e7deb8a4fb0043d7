import type { VirtualCode } from '@volar/language-core';
import type * as ts from 'typescript';
import type { VueCompilerOptions, VueLanguagePluginReturn } from '../types';
export declare class VueVirtualCode implements VirtualCode {
    fileName: string;
    languageId: string;
    initSnapshot: ts.IScriptSnapshot;
    vueCompilerOptions: VueCompilerOptions;
    plugins: VueLanguagePluginReturn[];
    ts: typeof import('typescript');
    id: string;
    _snapshot: import("alien-signals").Signal<ts.IScriptSnapshot>;
    _vueSfc: import("alien-signals").ISignal<import("@vue/compiler-sfc").SFCParseResult | undefined>;
    _sfc: import("../types").Sfc;
    _mappings: import("alien-signals").ISignal<{
        sourceOffsets: number[];
        generatedOffsets: number[];
        lengths: number[];
        data: import("@volar/language-core").CodeInformation;
    }[]>;
    _embeddedCodes: import("alien-signals").ISignal<VirtualCode[]>;
    get embeddedCodes(): VirtualCode[];
    get snapshot(): ts.IScriptSnapshot;
    get mappings(): {
        sourceOffsets: number[];
        generatedOffsets: number[];
        lengths: number[];
        data: import("@volar/language-core").CodeInformation;
    }[];
    constructor(fileName: string, languageId: string, initSnapshot: ts.IScriptSnapshot, vueCompilerOptions: VueCompilerOptions, plugins: VueLanguagePluginReturn[], ts: typeof import('typescript'));
    update(newSnapshot: ts.IScriptSnapshot): void;
}
