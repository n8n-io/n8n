import type { UiComponentDef } from '../core/types';
import UiText from './UiText.vue';

export const TEXT_DEF: UiComponentDef = {
	type: 'text',
	group: 'Display',
	label: 'Text',
	component: UiText,
	props: [{ displayName: 'Text', name: 'text', type: 'string', default: 'Text' }],
};
