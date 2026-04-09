import type { Language, SourceScript } from '@volar/language-core';
import type * as ts from 'typescript';
import type { TypeScriptServiceScript } from '../..';
export declare function getServiceScript(language: Language<string>, fileName: string): [serviceScript: TypeScriptServiceScript, targetScript: SourceScript<string>, sourceScript: SourceScript<string>] | [serviceScript: undefined, sourceScript: SourceScript<string>, sourceScript: SourceScript<string>] | [serviceScript: undefined, sourceScript: undefined, targetScript: undefined];
export declare function fixupImpliedNodeFormatForFile(ts: typeof import('typescript'), pluginExtensions: string[], sourceFile: ts.SourceFile, packageJsonInfoCache: ts.PackageJsonInfoCache | undefined, host: ts.ModuleResolutionHost, options: ts.CompilerOptions): (() => undefined) | undefined;
