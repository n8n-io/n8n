import type { BlockToolConstructorOptions } from '@editorjs/editorjs';
import Paragraph, { type ParagraphConfig, type ParagraphData } from '@editorjs/paragraph';

// `@editorjs/paragraph` types `config` as required, which keeps the stock
// class out of Editor.js's `{ class, inlineToolbar }` tool settings; this
// subclass only defaults it.
export class ParagraphTool extends Paragraph {
	constructor({
		data,
		config,
		api,
		readOnly,
	}: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>) {
		super({ data, api, readOnly, config: config ?? {} });
	}
}
