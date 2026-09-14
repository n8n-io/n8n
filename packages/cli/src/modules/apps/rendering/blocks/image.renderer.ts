import { UnexpectedError } from 'n8n-workflow';

import { isBlockType } from '../assert-block-type';
import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

/** `url`, `alt` and `caption` are not interpolated (not in the placeholder allowlist). */
export const imageBlockRenderer: BlockRenderer = {
	type: 'image',
	async render(block) {
		if (!isBlockType(block, 'image')) throw new UnexpectedError("Expected an 'image' block");
		return await renderPartial('block-image', {
			url: block.data.url,
			alt: block.data.alt ?? '',
			caption: block.data.caption,
		});
	},
};
