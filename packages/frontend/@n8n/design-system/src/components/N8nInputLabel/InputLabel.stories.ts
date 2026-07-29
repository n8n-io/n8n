import type { StoryFn } from '@storybook/vue3-vite';

import N8nInputLabel from './InputLabel.vue';
import N8nInput from '../N8nInput';

export default {
	title: 'Core/Input Label',
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
	template: `<div style="margin-top:50px">
			<n8n-input-label v-bind="args">
				<n8n-input />
			</n8n-input-label>
		</div>`,
});

export const InputLabel = Template.bind({});
InputLabel.args = {
	label: 'input label',
	tooltipText: 'more info...',
};
