import type { StoryFn } from '@storybook/vue3-vite';

import N8nLogo from './Logo.vue';

export default {
	title: 'Core/Logo',
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

	parameters: {
		docs: {
			description: { component: 'The n8n logo component in icon and wordmark variants.' },
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

export const Default = Template.bind({});
Default.args = {
	size: 'large',
	releaseChannel: 'stable',
};

export const Sizes: StoryFn = () => ({
	components: { N8nLogo },
	template: `
		<div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
			<N8nLogo size="large" release-channel="stable" />
			<N8nLogo size="small" :collapsed="false" release-channel="stable" />
			<N8nLogo size="small" :collapsed="true" release-channel="stable" />
		</div>
	`,
});

export const Variants: StoryFn = () => ({
	components: { N8nLogo },
	template: `
		<div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
			<N8nLogo size="large" release-channel="stable" />
			<N8nLogo size="large" release-channel="dev" />
			<N8nLogo size="large" release-channel="beta" />
			<N8nLogo size="large" release-channel="nightly" />
		</div>
	`,
});
