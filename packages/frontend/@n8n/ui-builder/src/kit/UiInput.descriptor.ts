import { STATE_PATH_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiInput from './UiInput.vue';

export const INPUT_DEF: UiComponentDef = {
	type: 'input',
	group: 'Input',
	label: 'Input',
	component: UiInput,
	bindsValueTo: 'value',
	props: [
		{
			displayName: 'Binds To',
			name: 'model',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: STATE_PATH_PROP_TYPE as any,
			default: '',
			placeholder: 'form.name',
			description:
				'The place in app state this input reads and writes, e.g. form.name. Anything else reading $state.form.name — a request body, another component — sees what was typed here.',
		},
		{ displayName: 'Placeholder', name: 'placeholder', type: 'string', default: '' },
	],
};
