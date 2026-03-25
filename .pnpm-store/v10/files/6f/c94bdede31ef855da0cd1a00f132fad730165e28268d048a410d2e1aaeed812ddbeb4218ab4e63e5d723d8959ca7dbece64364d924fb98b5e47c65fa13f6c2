import * as CompilerDOM from '@vue/compiler-dom';
import type * as ts from 'typescript';
import type { Code, SfcBlock, SfcBlockAttr, VueCodeInformation } from '../../types';
export declare const newLine = "\n";
export declare const endOfLine = ";\n";
export declare const combineLastMapping: VueCodeInformation;
export declare const identifierRegex: RegExp;
export declare function collectVars(ts: typeof import('typescript'), node: ts.Node, ast: ts.SourceFile, results?: string[]): string[];
export declare function collectIdentifiers(ts: typeof import('typescript'), node: ts.Node, results?: {
    id: ts.Identifier;
    isRest: boolean;
    initializer: ts.Expression | undefined;
}[], isRest?: boolean, initializer?: ts.Expression | undefined): {
    id: ts.Identifier;
    isRest: boolean;
    initializer: ts.Expression | undefined;
}[];
export declare function normalizeAttributeValue(node: CompilerDOM.TextNode): [string, number];
export declare function createTsAst(ts: typeof import('typescript'), astHolder: any, text: string): ts.SourceFile;
export declare function generateSfcBlockSection(block: SfcBlock, start: number, end: number, features: VueCodeInformation): Code;
export declare function generateSfcBlockAttrValue(src: SfcBlockAttr & object, text: string, features: VueCodeInformation): Generator<Code>;
