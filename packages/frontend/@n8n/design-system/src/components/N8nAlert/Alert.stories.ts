import type { StoryFn } from '@storybook/vue3-vite';

import N8nAlert from './Alert.vue';
import N8nIcon from '../N8nIcon';

export default {
	title: 'Core/Alert',
	component: N8nAlert,
	argTypes: {
		type: {
			type: 'select',
			options: ['success', 'info', 'warning', 'error'],
		},
		effect: {
			type: 'select',
			options: ['light', 'dark'],
		},
	},

	parameters: {
		docs: {
			description: {
				component: 'A contextual message banner for success, info, warning, and error feedback.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nAlert,
	},
	template: '<n8n-alert v-bind="args"><template #aside>custom content slot</template></n8n-alert>',
});

export const Default = Template.bind({});
Default.args = {
	type: 'info',
	effect: 'light',
	title: 'Alert title',
	description: 'Alert description',
	center: false,
	showIcon: true,
	background: true,
};

export const Variants: StoryFn = () => ({
	components: { N8nAlert },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<n8n-alert type="success" title="Success" description="This is a success alert." />
			<n8n-alert type="info" title="Info" description="This is an info alert." />
			<n8n-alert type="warning" title="Warning" description="This is a warning alert." />
			<n8n-alert type="error" title="Error" description="This is an error alert." />
		</div>
	`,
});

const TemplateForSlots: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nAlert,
		N8nIcon,
	},
	template: `<n8n-alert v-bind="args">
					<template #title>Title</template>
					Description
					<template #aside><button>Button</button></template>
					<template #icon>
						<n8n-icon icon="grin-stars" size="xlarge" />
					</template>
				</n8n-alert>`,
});

export const ContentInSlots = TemplateForSlots.bind({});
ContentInSlots.args = {
	type: 'info',
	effect: 'light',
	center: false,
	background: true,
	showIcon: false,
};
