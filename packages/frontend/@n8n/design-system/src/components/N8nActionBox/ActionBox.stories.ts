import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nActionBox from './ActionBox.vue';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';

export default {
	title: 'Atoms/ActionBox',
	component: N8nActionBox,
	argTypes: {
		calloutTheme: {
			control: {
				type: 'select',
			},
			options: ['info', 'success', 'warning', 'danger', 'custom'],
		},
	},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onClick: action('click'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nActionBox,
	},
	template: '<n8n-action-box v-bind="args" @click="onClick" />',
	methods,
});

export const ActionBox = DefaultTemplate.bind({});
ActionBox.args = {
	icon: { type: 'emoji', value: '😿' },
	heading: 'Headline you need to know',
	description:
		'Long description that you should know something is the way it is because of how it is. ',
	buttonText: 'Do something',
};

export const ActionBoxWithIcon = DefaultTemplate.bind({});
ActionBoxWithIcon.args = {
	icon: { type: 'icon', value: 'tree-pine' },
	heading: 'Create your first workflow',
	description: 'Get started by creating a new workflow to automate your tasks.',
	buttonText: 'Create Workflow',
};

const WithAdditionalContentTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nActionBox,
		N8nText,
		N8nLink,
	},
	template: `
		<n8n-action-box v-bind="args" @click="onClick">
			<template #additionalContent>
					<N8nText color="text-base">
						Read more on
					</N8nText>
					<N8nLink class="ml-4xs" href="https://n8n.io" target="_blank">our docs</N8nLink>
			</template>
		</n8n-action-box>
	`,
	methods,
});

export const ActionBoxWithAdditionalContent = WithAdditionalContentTemplate.bind({});
ActionBoxWithAdditionalContent.args = {
	icon: { type: 'emoji', value: '🚀' },
	heading: 'Launch your project',
	description:
		'Get started with your project by clicking the button below. Additional content is included.',
	buttonText: 'Get Started',
};
