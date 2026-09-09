import { UnexpectedError } from 'n8n-workflow';

import { isBlockType } from '../assert-block-type';
import { renderRichText } from '../rich-text';
import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

export const headerBlockRenderer: BlockRenderer = {
	type: 'header',
	async render(block, ctx) {
		if (!isBlockType(block, 'header')) throw new UnexpectedError("Expected a 'header' block");
		return await renderPartial('block-header', {
			text: renderRichText(block.data.text, ctx),
			isH1: block.data.level === 1,
			isH2: block.data.level === 2,
			isH3: block.data.level === 3,
			isH4: block.data.level === 4,
			isH5: block.data.level === 5,
			isH6: block.data.level === 6,
		});
	},
};
