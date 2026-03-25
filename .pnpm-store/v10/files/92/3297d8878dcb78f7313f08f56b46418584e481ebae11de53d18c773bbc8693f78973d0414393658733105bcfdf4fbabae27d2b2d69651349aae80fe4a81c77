import * as CompilerDOM from '@vue/compiler-dom';
import type * as ts from 'typescript';
import type { Code } from '../../types';
import type { TemplateCodegenContext } from './context';
import type { TemplateCodegenOptions } from './index';
export declare function generateElementEvents(options: TemplateCodegenOptions, ctx: TemplateCodegenContext, node: CompilerDOM.ElementNode, componentVar: string, componentInstanceVar: string, emitVar: string, eventsVar: string): Generator<Code>;
export declare function generateEventArg(ctx: TemplateCodegenContext, arg: CompilerDOM.SimpleExpressionNode, enableHover: boolean): Generator<Code>;
export declare function generateEventExpression(options: TemplateCodegenOptions, ctx: TemplateCodegenContext, prop: CompilerDOM.DirectiveNode): Generator<Code>;
export declare function isCompoundExpression(ts: typeof import('typescript'), ast: ts.SourceFile): boolean;
