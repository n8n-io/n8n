import type { StoryFn } from '@storybook/vue';
import N8nInfoTip from './InfoTip.vue';

export default {
	title: 'Atoms/InfoTip',
	component: N8nInfoTip,
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInfoTip,
	},
	template:
		'<n8n-info-tip v-bind="$props">Need help doing something? <a href="/docs" target="_blank">Open docs</a></n8n-info-tip>',
});

export const Note = Template.bind({});

export const Tooltip = Template.bind({});
Tooltip.args = {
	type: 'tooltip',
	tooltipPlacement: 'right',
};
