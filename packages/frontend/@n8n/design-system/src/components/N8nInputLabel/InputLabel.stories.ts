import type { StoryFn } from '@storybook/vue3-vite';

import N8nInputLabel from './InputLabel.vue';
import N8nInput from '../N8nInput';

export default {
	title: 'Core/InputLabel',
	component: N8nInputLabel,
	argTypes: {},
	parameters: {
		docs: {
			description: {
				component: 'A label element for form controls with optional helper and required markers.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nInputLabel,
		N8nInput,
	},
	template: `
			<n8n-input-label v-bind="args">
				<n8n-input />
			</n8n-input-label>
		`,
});

export const Default = Template.bind({});
Default.args = {
	label: 'input label',
	tooltipText: 'more info...',
};
