import { DEFAULT_REGION, type UiComponentDef } from '../core/types';
import UiCard from './UiCard.vue';

export const CARD_DEF: UiComponentDef = {
	type: 'card',
	label: 'Card',
	group: 'Layout',
	component: UiCard,
	// Three drop points rather than one. The document says which region a
	// child belongs to; the component decides where that region renders.
	regions: [
		{ name: 'header', label: 'Header' },
		{ name: DEFAULT_REGION, label: 'Body' },
		{ name: 'footer', label: 'Footer' },
	],
	props: [{ displayName: 'Padded', name: 'padded', type: 'boolean', default: true }],
};
