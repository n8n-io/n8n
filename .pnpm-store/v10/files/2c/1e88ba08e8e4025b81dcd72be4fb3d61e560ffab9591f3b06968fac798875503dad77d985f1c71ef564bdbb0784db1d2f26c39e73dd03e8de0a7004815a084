import { LanguagePlugin } from '@volar/language-core';
import type * as ts from 'typescript';
import type { VueCompilerOptions } from './types';
import { VueVirtualCode } from './virtualFile/vueFile';
export declare function createVueLanguagePlugin<T>(ts: typeof import('typescript'), compilerOptions: ts.CompilerOptions, vueCompilerOptions: VueCompilerOptions, asFileName: (scriptId: T) => string): LanguagePlugin<T, VueVirtualCode>;
export declare function getAllExtensions(options: VueCompilerOptions): string[];
