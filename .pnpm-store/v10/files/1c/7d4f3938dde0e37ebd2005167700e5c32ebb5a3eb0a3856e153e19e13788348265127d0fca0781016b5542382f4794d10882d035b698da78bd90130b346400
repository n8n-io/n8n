import type * as ts from 'typescript';
import { VueCompilerOptions } from '../types';
export declare function getLocalTypesGenerator(compilerOptions: ts.CompilerOptions, vueCompilerOptions: VueCompilerOptions): {
    generate: (names: string[]) => Generator<string, void, unknown>;
    getUsedNames(): Set<string>;
    readonly PrettifyLocal: string;
    readonly OmitKeepDiscriminatedUnion: string;
    readonly WithDefaults: string;
    readonly WithSlots: string;
    readonly PropsChildren: string;
    readonly TypePropsToOption: string;
    readonly OmitIndexSignature: string;
};
