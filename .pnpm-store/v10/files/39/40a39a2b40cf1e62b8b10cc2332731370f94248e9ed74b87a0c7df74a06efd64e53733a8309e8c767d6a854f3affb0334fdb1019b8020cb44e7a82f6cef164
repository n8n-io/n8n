import { TemplateChildNode } from '@vue/compiler-dom';
import { SFCTemplateBlock } from '@vue/compiler-sfc';
import Documentation from './Documentation';
import type { ParseOptions, TemplateHandler } from './types';
export interface TemplateParserOptions {
    functional: boolean;
}
export default function parseTemplate(tpl: Pick<SFCTemplateBlock, 'content' | 'attrs'>, documentation: Documentation, handlers: TemplateHandler[], opts: ParseOptions): void;
export declare function traverse(templateAst: TemplateChildNode, documentation: Documentation, handlers: TemplateHandler[], siblings: TemplateChildNode[], options: TemplateParserOptions): void;
