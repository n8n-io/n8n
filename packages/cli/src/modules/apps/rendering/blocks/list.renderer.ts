import { UnexpectedError } from 'n8n-workflow';

import { isBlockType } from '../assert-block-type';
import { renderRichText } from '../rich-text';
import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

export const listBlockRenderer: BlockRenderer = {
	type: 'list',
	async render(block, ctx) {
		if (!isBlockType(block, 'list')) throw new UnexpectedError("Expected a 'list' block");
		return await renderPartial('block-list', {
			ordered: block.data.style === 'ordered',
			items: block.data.items.map((item) => renderRichText(item, ctx)),
		});
	},
};
