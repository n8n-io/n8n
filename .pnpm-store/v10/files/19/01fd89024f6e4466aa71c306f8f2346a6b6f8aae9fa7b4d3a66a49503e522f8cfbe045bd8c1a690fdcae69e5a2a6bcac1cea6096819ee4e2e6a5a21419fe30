import type { CodeInformation, SourceScript } from '@volar/language-core';
import { Language } from '@volar/language-core';
import type * as ts from 'typescript';
import type { TypeScriptServiceScript } from '../..';
/**
 * This file contains a number of facilities for transforming `ts.Diagnostic`s returned
 * from the  base TypeScript LanguageService, which reference locations in generated
 * TS code (e.g. the TypeScript codegen'd from the script portion of a .vue file) into locations
 * in the script portion of the .vue file.
 */
export declare function transformCallHierarchyItem(language: Language<string>, item: ts.CallHierarchyItem, fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean): ts.CallHierarchyItem;
export declare function transformDiagnostic<T extends ts.Diagnostic>(language: Language<string>, diagnostic: T, program: ts.Program | undefined, isTsc: boolean): T | undefined;
export declare function fillSourceFileText(language: Language<string>, sourceFile: ts.SourceFile): void;
export declare function transformFileTextChanges(language: Language<string>, changes: readonly ts.FileTextChanges[], fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean): ts.FileTextChanges[];
export declare function transformDocumentSpan<T extends ts.DocumentSpan>(language: Language<string>, documentSpan: T, fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean, shouldFallback?: boolean): T | undefined;
export declare function transformSpan(language: Language<string>, fileName: string | undefined, textSpan: ts.TextSpan | undefined, fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean): {
    fileName: string;
    textSpan: ts.TextSpan;
} | undefined;
export declare function transformTextChange(sourceScript: SourceScript<string> | undefined, language: Language<string>, serviceScript: TypeScriptServiceScript, textChange: ts.TextChange, fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean): [string, ts.TextChange] | undefined;
export declare function transformTextSpan(sourceScript: SourceScript<string> | undefined, language: Language<string>, serviceScript: TypeScriptServiceScript, textSpan: ts.TextSpan, fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean): [string, ts.TextSpan] | undefined;
export declare function toSourceOffset(sourceScript: SourceScript<string> | undefined, language: Language<string>, serviceScript: TypeScriptServiceScript, position: number, filter: (data: CodeInformation) => boolean): [fileName: string, offset: number] | undefined;
export declare function toSourceRanges(sourceScript: SourceScript<string> | undefined, language: Language<string>, serviceScript: TypeScriptServiceScript, start: number, end: number, fallbackToAnyMatch: boolean, filter: (data: CodeInformation) => boolean): Generator<[fileName: string, start: number, end: number]>;
export declare function toSourceOffsets(sourceScript: SourceScript<string> | undefined, language: Language<string>, serviceScript: TypeScriptServiceScript, position: number, filter: (data: CodeInformation) => boolean): Generator<[fileName: string, offset: number]>;
export declare function toGeneratedRanges(language: Language, serviceScript: TypeScriptServiceScript, sourceScript: SourceScript<string>, start: number, end: number, filter: (data: CodeInformation) => boolean): Generator<readonly [number, number], void, unknown>;
export declare function toGeneratedOffset(language: Language, serviceScript: TypeScriptServiceScript, sourceScript: SourceScript<string>, position: number, filter: (data: CodeInformation) => boolean): number | undefined;
export declare function toGeneratedOffsets(language: Language, serviceScript: TypeScriptServiceScript, sourceScript: SourceScript<string>, position: number, filter: (data: CodeInformation) => boolean): Generator<readonly [number, import("@volar/language-core").Mapping<CodeInformation>], void, unknown>;
export declare function getMappingOffset(language: Language, serviceScript: TypeScriptServiceScript): number;
