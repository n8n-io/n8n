import * as CompilerDOM from '@vue/compiler-dom';
import type { Code, VueCodeInformation } from '../../types';
import type { TemplateCodegenContext } from './context';
import type { TemplateCodegenOptions } from './index';
export interface FailedPropExpression {
    node: CompilerDOM.SimpleExpressionNode;
    prefix: string;
    suffix: string;
}
export declare function generateElementProps(options: TemplateCodegenOptions, ctx: TemplateCodegenContext, node: CompilerDOM.ElementNode, props: CompilerDOM.ElementNode['props'], strictPropsCheck: boolean, enableCodeFeatures: boolean, failedPropExps?: FailedPropExpression[]): Generator<Code>;
export declare function generatePropExp(options: TemplateCodegenOptions, ctx: TemplateCodegenContext, prop: CompilerDOM.DirectiveNode, exp: CompilerDOM.SimpleExpressionNode | undefined, features: VueCodeInformation, enableCodeFeatures?: boolean): Generator<Code>;
