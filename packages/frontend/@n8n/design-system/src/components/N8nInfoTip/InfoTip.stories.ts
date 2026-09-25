import type { StoryFn } from '@storybook/vue3-vite';

import N8nInfoTip from './InfoTip.vue';

export default {
	title: 'Core/InfoTip',
	component: N8nInfoTip,

	parameters: {
		docs: {
			description: { component: 'An inline helper text element for short contextual guidance.' },
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nInfoTip,
	},
	template:
		'<n8n-info-tip v-bind="args">Need help doing something? <a href="/docs" target="_blank">Open docs</a></n8n-info-tip>',
});

export const Default = Template.bind({});

export const Variants: StoryFn = () => ({
	components: { N8nInfoTip },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<n8n-info-tip theme="info">Info tip</n8n-info-tip>
			<n8n-info-tip theme="info-light">Info light tip</n8n-info-tip>
			<n8n-info-tip theme="warning">Warning tip</n8n-info-tip>
			<n8n-info-tip theme="warning-light">Warning light tip</n8n-info-tip>
			<n8n-info-tip theme="danger">Danger tip</n8n-info-tip>
			<n8n-info-tip theme="success">Success tip</n8n-info-tip>
			<n8n-info-tip type="tooltip" tooltip-placement="right">Tooltip tip</n8n-info-tip>
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { N8nInfoTip },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<n8n-info-tip size="xsmall">XSmall</n8n-info-tip>
			<n8n-info-tip size="small">Small</n8n-info-tip>
			<n8n-info-tip size="medium">Medium</n8n-info-tip>
			<n8n-info-tip size="large">Large</n8n-info-tip>
			<n8n-info-tip size="xlarge">XLarge</n8n-info-tip>
		</div>
	`,
});

export const Tooltip = Template.bind({});
Tooltip.args = {
	type: 'tooltip',
	tooltipPlacement: 'right',
};
