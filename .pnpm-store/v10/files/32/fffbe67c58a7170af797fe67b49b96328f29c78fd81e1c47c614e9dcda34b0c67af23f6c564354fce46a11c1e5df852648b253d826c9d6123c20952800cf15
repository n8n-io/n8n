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
    private _snapshot;
    private _vueSfc;
    private _sfc;
    private _embeddedCodes;
    private _mappings;
    get snapshot(): ts.IScriptSnapshot;
    get vueSfc(): import("@vue/compiler-sfc").SFCParseResult | undefined;
    get sfc(): import("../types").Sfc;
    get embeddedCodes(): VirtualCode[];
    get mappings(): {
        sourceOffsets: number[];
        generatedOffsets: number[];
        lengths: number[];
        data: import("@volar/language-core").CodeInformation;
    }[];
    constructor(fileName: string, languageId: string, initSnapshot: ts.IScriptSnapshot, vueCompilerOptions: VueCompilerOptions, plugins: VueLanguagePluginReturn[], ts: typeof import('typescript'));
    update(newSnapshot: ts.IScriptSnapshot): void;
}
