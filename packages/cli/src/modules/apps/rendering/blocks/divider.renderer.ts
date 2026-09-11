import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

export const dividerBlockRenderer: BlockRenderer = {
	type: 'divider',
	async render() {
		return await renderPartial('block-divider', {});
	},
};
