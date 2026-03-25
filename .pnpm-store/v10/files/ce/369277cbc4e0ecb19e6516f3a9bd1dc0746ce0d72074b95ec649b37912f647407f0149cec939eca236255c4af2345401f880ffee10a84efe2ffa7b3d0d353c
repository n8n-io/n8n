import * as CompilerDOM from '@vue/compiler-dom';
import type { Code } from '../../types';
import type { TemplateCodegenContext } from './context';
import type { TemplateCodegenOptions } from './index';
export declare function generateComponent(options: TemplateCodegenOptions, ctx: TemplateCodegenContext, node: CompilerDOM.ElementNode, currentComponent: CompilerDOM.ElementNode | undefined): Generator<Code>;
export declare function generateElement(options: TemplateCodegenOptions, ctx: TemplateCodegenContext, node: CompilerDOM.ElementNode, currentComponent: CompilerDOM.ElementNode | undefined, componentCtxVar: string | undefined, isVForChild: boolean): Generator<Code>;
export declare function getCanonicalComponentName(tagText: string): string;
export declare function getPossibleOriginalComponentNames(tagText: string, deduplicate: boolean): string[];
