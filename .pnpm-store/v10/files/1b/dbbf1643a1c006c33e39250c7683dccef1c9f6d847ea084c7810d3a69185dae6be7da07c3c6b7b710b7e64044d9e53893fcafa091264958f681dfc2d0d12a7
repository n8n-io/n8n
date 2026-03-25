import type * as ts from 'typescript';
import type { Code, VueCodeInformation } from '../../types';
import type { TemplateCodegenContext } from './context';
export declare function generateInterpolation(options: {
    ts: typeof ts;
    destructuredPropNames: Set<string> | undefined;
    templateRefNames: Set<string> | undefined;
}, ctx: TemplateCodegenContext, source: string, data: VueCodeInformation | ((offset: number) => VueCodeInformation) | undefined, _code: string, start: number | undefined, astHolder?: any, prefix?: string, suffix?: string): Generator<Code>;
