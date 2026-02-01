import type { StoryFn } from '@storybook/vue3-vite';

import N8nLogo from './Logo.vue';

export default {
	title: 'Atoms/Logo',
	component: N8nLogo,
	argTypes: {
		size: {
			control: {
				type: 'select',
				options: ['large', 'small'],
			},
		},
		collapsed: {
			control: 'boolean',
			if: { arg: 'size', eq: 'small' },
		},
		releaseChannel: {
			control: {
				type: 'select',
				options: ['stable', 'dev', 'beta', 'nightly'],
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nLogo,
	},
	template: '<N8nLogo v-bind="args" />',
});

export const Large = Template.bind({});
Large.args = {
	size: 'large',
	releaseChannel: 'stable',
};

export const SmallExpanded = Template.bind({});
SmallExpanded.args = {
	size: 'small',
	collapsed: false,
	releaseChannel: 'stable',
};

export const SmallCollapsed = Template.bind({});
SmallCollapsed.args = {
	size: 'small',
	collapsed: true,
	releaseChannel: 'stable',
};

export const DevChannel = Template.bind({});
DevChannel.args = {
	size: 'large',
	releaseChannel: 'dev',
};

export const BetaChannel = Template.bind({});
BetaChannel.args = {
	size: 'large',
	releaseChannel: 'beta',
};

export const NightlyChannel = Template.bind({});
NightlyChannel.args = {
	size: 'large',
	releaseChannel: 'nightly',
};
