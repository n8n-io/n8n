import { UnexpectedError } from 'n8n-workflow';

import { isBlockType } from '../assert-block-type';
import { renderRichText } from '../rich-text';
import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

export const paragraphBlockRenderer: BlockRenderer = {
	type: 'paragraph',
	async render(block, ctx) {
		if (!isBlockType(block, 'paragraph')) throw new UnexpectedError("Expected a 'paragraph' block");
		return await renderPartial('block-paragraph', { text: renderRichText(block.data.text, ctx) });
	},
};
