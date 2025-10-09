import type { StoryFn } from '@storybook/vue3-vite';

import N8nTooltip from './Tooltip.vue';

export default {
	title: 'Atoms/Tooltip',
	component: N8nTooltip,
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
		N8nTooltip,
	},
	template: '<n8n-tooltip v-bind="args"><button>Hover me</button></n8n-tooltip>',
});

export const Tooltip = Template.bind({});
Tooltip.args = {
	content: '...',
};

export const TooltipWithButtons = Template.bind({});
TooltipWithButtons.args = {
	content: 'Hello world!',
	buttons: [
		{
			attrs: {
				label: 'Button 1',
				'data-test-id': 'tooltip-button',
			},
			listeners: {
				onClick: () => alert('Clicked 1'),
			},
		},
		{
			attrs: {
				label: 'Button 2',
				'data-test-id': 'tooltip-button',
			},
			listeners: {
				onClick: () => alert('Clicked 2'),
			},
		},
	],
};
