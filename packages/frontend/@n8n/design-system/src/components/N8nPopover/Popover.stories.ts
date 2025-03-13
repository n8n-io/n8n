import type { StoryFn } from '@storybook/vue3';

import N8nPopover from './Popover.vue';

export default {
	title: 'Atoms/Popover',
	component: N8nPopover,
	argTypes: {
		effect: {
			control: 'select',
			options: ['dark', 'light'],
		},
		placement: {
			control: 'select',
			options: [
				'top',
				'top-start',
				'top-end',
				'bottom',
				'bottom-start',
				'bottom-end',
				'left',
				'left-start',
				'left-end',
				'right',
				'right-start',
				'right-end',
			],
		},
		disabled: {
			control: { type: 'boolean' },
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nPopover,
	},
	template: `<n8n-popover v-bind="args">
			<div style="margin:50px; display: inline-block;">
				<span>yo</span>
			</div>
			<template #content>
				Popover
			</template>
		</n8n-popover>`,
});

export const Popover = Template.bind({});
Popover.args = {
	content: '...',
};
