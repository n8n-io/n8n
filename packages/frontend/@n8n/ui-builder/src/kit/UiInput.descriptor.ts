import { STATE_PATH_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiInput from './UiInput.vue';

export const INPUT_DEF: UiComponentDef = {
	type: 'input',
	group: 'Input',
	label: 'Input',
	component: UiInput,
	props: [
		{ displayName: 'Value', name: 'value', type: 'string', default: '' },
		{
			displayName: 'Writes To',
			name: 'model',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: STATE_PATH_PROP_TYPE as any,
			default: '',
		},
		{ displayName: 'Placeholder', name: 'placeholder', type: 'string', default: '' },
	],
};
