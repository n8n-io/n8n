import type { StoryFn } from '@storybook/vue3';
import N8nLogo from './Logo.vue';

export default {
	title: 'Atoms/Logo',
	component: N8nLogo,
	argTypes: {
		location: {
			control: {
				type: 'select',
				options: ['authView', 'sidebar'],
			},
		},
		collapsed: {
			control: 'boolean',
			if: { arg: 'location', eq: 'sidebar' },
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

export const AuthView = Template.bind({});
AuthView.args = {
	location: 'authView',
	releaseChannel: 'stable',
};

export const SidebarExpanded = Template.bind({});
SidebarExpanded.args = {
	location: 'sidebar',
	collapsed: false,
	releaseChannel: 'stable',
};

export const SidebarCollapsed = Template.bind({});
SidebarCollapsed.args = {
	location: 'sidebar',
	collapsed: true,
	releaseChannel: 'stable',
};

export const DevChannel = Template.bind({});
DevChannel.args = {
	location: 'authView',
	releaseChannel: 'dev',
};

export const BetaChannel = Template.bind({});
BetaChannel.args = {
	location: 'authView',
	releaseChannel: 'beta',
};

export const NightlyChannel = Template.bind({});
NightlyChannel.args = {
	location: 'authView',
	releaseChannel: 'nightly',
};
