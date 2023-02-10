import type { StoryFn } from '@storybook/vue';
import N8nAlert from './Alert.vue';
import N8nIcon from '../N8nIcon';

export default {
	title: 'Atoms/Alert',
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
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nAlert,
	},
	template:
		'<div style="position: relative; width: 100%; height: 300px;"><n8n-alert v-bind="$props"><template #aside>custom content slot</template></n8n-alert></div>',
});

export const ContentAsProps = Template.bind({});
ContentAsProps.args = {
	type: 'info',
	effect: 'light',
	title: 'Alert title',
	description: 'Alert description',
	center: false,
	showIcon: true,
	background: true,
};

const TemplateForSlots: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nAlert,
		N8nIcon,
	},
	template: `<div style="position: relative; width: 100%; height: 300px;">
			  <n8n-alert v-bind="$props">
					<template #title>Title</template>
					<template>Description</template>
					<template #aside><button>Button</button></template>
					<template #icon>
						<n8n-icon icon="grin-stars" size="xlarge" />
					</template>
				</n8n-alert>
		</div>`,
});

export const ContentInSlots = TemplateForSlots.bind({});
ContentInSlots.args = {
	type: 'info',
	effect: 'light',
	center: false,
	background: true,
	showIcon: false,
};
