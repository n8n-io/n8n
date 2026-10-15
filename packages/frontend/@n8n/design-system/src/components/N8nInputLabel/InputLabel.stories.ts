import type { StoryFn } from '@storybook/vue3-vite';

import N8nInputLabel from './InputLabel.vue';

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
	},
	template: `
			<n8n-input-label v-bind="args" />
		`,
});

export const Default = Template.bind({});
Default.args = {
	label: 'input label',
	tooltipText: 'more info...',
};
