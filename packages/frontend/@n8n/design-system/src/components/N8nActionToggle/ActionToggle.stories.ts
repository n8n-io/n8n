import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nActionToggle from './ActionToggle.vue';

export default {
	title: 'Core/ActionToggle',
	component: N8nActionToggle,
	argTypes: {
		placement: {
			type: 'select',
			options: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'],
		},
		theme: {
			type: 'select',
			options: ['default', 'dark'],
		},
		size: {
			type: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		iconSize: {
			type: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A two-state toggle control for switching between active and inactive actions.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onAction: action('action'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nActionToggle,
	},
	template: '<n8n-action-toggle v-bind="args" @action="onAction" />',
	methods,
});

export const Default = Template.bind({});
Default.args = {
	actions: [
		{
			label: 'Go',
			value: 'go',
		},
		{
			label: 'Stop',
			value: 'stop',
		},
	],
};

export const Variants: StoryFn = () => ({
	components: { N8nActionToggle },
	setup() {
		return {
			actions: [
				{ label: 'Go', value: 'go' },
				{ label: 'Stop', value: 'stop' },
			],
		};
	},
	template: `
		<div style="display: flex; gap: 24px; align-items: flex-start;">
			<n8n-action-toggle theme="default" :actions="actions" />
			<div style="padding: 12px; background: var(--color--background--shade-2);">
				<n8n-action-toggle theme="dark" :actions="actions" />
			</div>
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { N8nActionToggle },
	setup() {
		return {
			actions: [
				{ label: 'Go', value: 'go' },
				{ label: 'Stop', value: 'stop' },
			],
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
			<div style="display: flex; align-items: center; gap: var(--spacing--xs);">
				<n8n-action-toggle :actions="actions" />
				<span>Default: button small (28px), icon small (12px)</span>
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--xs);">
				<n8n-action-toggle :actions="actions" theme="dark" icon-size="medium" />
				<span>Workflow and folder cards: button small (28px), icon medium (14px)</span>
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--xs);">
				<n8n-action-toggle :actions="actions" theme="dark" size="xsmall" />
				<span>NDV parameter options: button xsmall (24px), icon small (12px)</span>
			</div>
		</div>
	`,
});

export const WithDisabledTooltip = Template.bind({});
WithDisabledTooltip.args = {
	actions: [
		{
			label: 'Duplicate',
			value: 'duplicate',
		},
		{
			label: 'Delete',
			value: 'delete',
			disabled: true,
			tooltip: 'This item is assigned and can’t be deleted.',
		},
	],
};
