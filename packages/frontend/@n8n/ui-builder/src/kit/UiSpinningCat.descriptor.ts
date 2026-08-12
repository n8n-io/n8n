import type { UiComponentDef } from '../core/types';
import UiSpinningCat from './UiSpinningCat.vue';

export const SPINNING_CAT_DEF: UiComponentDef = {
	type: 'spinningCat',
	group: 'Display',
	label: 'Spinning Cat',
	icon: 'sparkles',
	component: UiSpinningCat,
	// Decorative only: a fixed emoji, spinning, nothing an app author can point
	// at state, so the one prop is cosmetic sizing rather than content.
	props: [{ displayName: 'Size (px)', name: 'size', type: 'number', default: 40 }],
};
