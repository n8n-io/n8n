import N8nCallout from './Callout.vue';
import { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/Callout',
	component: N8nCallout,
	argTypes: {
		theme: {
			control: {
				type: 'select',
				options: ['info', 'success', 'warning', 'danger', 'custom'],
			},
		},
		message: {
			control: {
				type: 'text',
			},
		},
		icon: {
			control: {
				type: 'text',
			},
		},
	},
};

const template : StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCallout,
	},
	template: `<n8n-callout v-bind="$props"></n8n-callout>`,
});

export const callout = template.bind({});
callout.args = {
	theme: 'custom',
	icon: 'code-branch',
	message: 'This is a callout. <a href="https://n8n.io" target="_blank">Read more.</a>',
};
