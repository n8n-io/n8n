import N8nCallout from './Callout.vue';
import { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/Callout',
	component: N8nCallout,
	argTypes: {
		theme: {
			control: {
				type: 'select',
				options: ['info', 'secondary', 'success', 'warning', 'danger', 'custom'],
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
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/tPpJvbrnHbP8C496cYuwyW/Node-pinning?node-id=15%3A5777',
		},
	},
};

const template : StoryFn = (_, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCallout,
	},
	template: `<n8n-callout v-bind="$props"></n8n-callout>`,
});

export const customCallout = template.bind({});
customCallout.args = {
	theme: 'custom',
	icon: 'code-branch',
	message: 'This is a callout.',
	actionText: 'Read more'
};

export const secondaryCallout = template.bind({});
secondaryCallout.args = {
	theme: 'secondary',
	icon: 'thumbtack',
	message: 'This data is pinned.',
	actionText: 'Unpin',
	trailingLinkText: 'Learn more',
	trailingLinkUrl: 'https://n8n.io',
};
