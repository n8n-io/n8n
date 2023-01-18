import N8nInputLabel from './InputLabel.vue';
import N8nInput from '../N8nInput';
import type { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/Input Label',
	component: N8nInputLabel,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInputLabel,
		N8nInput,
	},
	template:
		'<div style="margin-top:50px"><n8n-input-label v-bind="$props"><n8n-input /></n8n-input-label></div>',
});

export const InputLabel = Template.bind({});
InputLabel.args = {
	label: 'input label',
	tooltipText: 'more info...',
};
