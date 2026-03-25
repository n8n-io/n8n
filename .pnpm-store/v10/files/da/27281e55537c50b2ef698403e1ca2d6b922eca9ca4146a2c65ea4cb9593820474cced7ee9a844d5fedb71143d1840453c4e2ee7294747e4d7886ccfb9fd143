import type { Code } from '../../types';
import { TemplateCodegenContext } from '../template/context';
import type { ScriptCodegenContext } from './context';
import { type ScriptCodegenOptions } from './index';
export declare function generateTemplate(options: ScriptCodegenOptions, ctx: ScriptCodegenContext): Generator<Code, TemplateCodegenContext>;
export declare function generateTemplateDirectives(options: ScriptCodegenOptions): Generator<Code>;
export declare function generateCssClassProperty(styleIndex: number, classNameWithDot: string, offset: number, propertyType: string, optional: boolean): Generator<Code>;
export declare function getTemplateUsageVars(options: ScriptCodegenOptions, ctx: ScriptCodegenContext): Set<string>;
