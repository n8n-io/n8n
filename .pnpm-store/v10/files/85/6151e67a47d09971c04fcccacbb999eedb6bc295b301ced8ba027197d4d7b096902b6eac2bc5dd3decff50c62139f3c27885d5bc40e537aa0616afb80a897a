import { NodeHtmlMarkdownOptions } from './options';
import { TranslatorCollection, TranslatorConfigObject } from './translator';
export declare type FileCollection = {
    [fileName: string]: string;
};
declare type Options = Partial<NodeHtmlMarkdownOptions>;
export declare class NodeHtmlMarkdown {
    translators: TranslatorCollection;
    aTagTranslators: TranslatorCollection;
    codeBlockTranslators: TranslatorCollection;
    tableTranslators: TranslatorCollection;
    tableRowTranslators: TranslatorCollection;
    tableCellTranslators: TranslatorCollection;
    readonly options: NodeHtmlMarkdownOptions;
    constructor(options?: Options, customTranslators?: TranslatorConfigObject, customCodeBlockTranslators?: TranslatorConfigObject);
    /**
     * Translate HTML source text to markdown
     */
    static translate(html: string, options?: Options, customTranslators?: TranslatorConfigObject, customCodeBlockTranslators?: TranslatorConfigObject): string;
    /**
     * Translate collection of HTML source text to markdown
     */
    static translate(files: FileCollection, options?: Options, customTranslators?: TranslatorConfigObject, customCodeBlockTranslators?: TranslatorConfigObject): FileCollection;
    /**
     * Translate HTML source text to markdown
     */
    translate(html: string): string;
    /**
     * Translate collection of HTML source text to markdown
     */
    translate(files: FileCollection): FileCollection;
    private translateWorker;
}
export {};
