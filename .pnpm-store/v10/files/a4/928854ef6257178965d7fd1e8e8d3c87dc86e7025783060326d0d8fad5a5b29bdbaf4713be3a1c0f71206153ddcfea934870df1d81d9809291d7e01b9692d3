import { marked } from 'marked';
import { RedocNormalizedOptions } from './RedocNormalizedOptions';
import type { MarkdownHeading, MDXComponentMeta } from './types';
export declare const LEGACY_REGEXP = "^ {0,3}<!-- ReDoc-Inject:\\s+?<({component}).*?/?>\\s+?-->\\s*$";
export declare const MDX_COMPONENT_REGEXP: string;
export declare const COMPONENT_REGEXP: string;
export declare function buildComponentComment(name: string): string;
export declare class MarkdownRenderer {
    options?: RedocNormalizedOptions | undefined;
    parentId?: string | undefined;
    static containsComponent(rawText: string, componentName: string): boolean;
    static getTextBeforeHading(md: string, heading: string): string;
    headings: MarkdownHeading[];
    currentTopHeading: MarkdownHeading;
    parser: marked.Parser;
    private headingEnhanceRenderer;
    private originalHeadingRule;
    constructor(options?: RedocNormalizedOptions | undefined, parentId?: string | undefined);
    saveHeading(name: string, level: number, container?: MarkdownHeading[], parentId?: string): MarkdownHeading;
    flattenHeadings(container?: MarkdownHeading[]): MarkdownHeading[];
    attachHeadingsDescriptions(rawText: string): void;
    headingRule: (text: string, level: 1 | 2 | 3 | 4 | 5 | 6, raw: string, slugger: marked.Slugger) => string;
    renderMd(rawText: string, extractHeadings?: boolean): string;
    extractHeadings(rawText: string): MarkdownHeading[];
    renderMdWithComponents(rawText: string): Array<string | MDXComponentMeta>;
}
