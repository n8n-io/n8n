import type * as ts from 'typescript';
import type { ScriptRanges } from '../../parsers/scriptRanges';
import type { ScriptSetupRanges } from '../../parsers/scriptSetupRanges';
import type { Code, Sfc, VueCompilerOptions } from '../../types';
import type { TemplateCodegenContext } from '../template/context';
import { ScriptCodegenContext } from './context';
export interface ScriptCodegenOptions {
    ts: typeof ts;
    compilerOptions: ts.CompilerOptions;
    vueCompilerOptions: VueCompilerOptions;
    sfc: Sfc;
    edited: boolean;
    fileName: string;
    lang: string;
    scriptRanges: ScriptRanges | undefined;
    scriptSetupRanges: ScriptSetupRanges | undefined;
    templateCodegen: TemplateCodegenContext & {
        codes: Code[];
    } | undefined;
    destructuredPropNames: Set<string>;
    templateRefNames: Set<string>;
    appendGlobalTypes: boolean;
}
export declare function generateScript(options: ScriptCodegenOptions): Generator<Code, ScriptCodegenContext>;
export declare function generateScriptSectionPartiallyEnding(source: string, end: number, mark: string, delimiter?: string): Generator<Code>;
