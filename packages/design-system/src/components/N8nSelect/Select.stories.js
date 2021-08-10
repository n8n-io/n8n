import N8nSelect from './Select.vue';
import N8nOption from '../N8nOption';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Select',
	component: N8nSelect,
	argTypes: {
		disabled: {
			control: {
				type: 'boolean',
			},
		},
		size: {
			control: {
				type: 'select',
				options: ['large', 'small', 'mini'],
			},
		},
		clearable: {
			control: {
				type: 'boolean',
			},
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onInput: action('input'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nSelect,
		N8nOption,
	},
	template: '<n8n-select v-bind="$props" v-model="val" @input="onInput"><n8n-option value="1">op1</n8n-option><n8n-option value="2">op2</n8n-option></n8n-select>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const Input = Template.bind({});
Input.args = {
};

