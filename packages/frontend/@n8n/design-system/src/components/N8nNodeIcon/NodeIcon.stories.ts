import type { StoryFn } from '@storybook/vue3-vite';

import N8nNodeIcon from './NodeIcon.vue';

const sampleIcon =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#FF6D5A"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif">n8</text></svg>',
	);

export default {
	title: 'Core/NodeIcon',
	component: N8nNodeIcon,

	parameters: {
		docs: {
			description: {
				component: 'An icon component for workflow node brands and node-type visuals.',
			},
		},
	},
};

const DefaultTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nNodeIcon,
	},
	template: '<N8nNodeIcon v-bind="args" />',
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	type: 'file',
	src: sampleIcon,
	size: 40,
};

export const Variants: StoryFn = () => ({
	components: { N8nNodeIcon },
	template: `
		<div style="display: flex; gap: 24px; align-items: center;">
			<n8n-node-icon type="file" src="https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/cartman.svg" :size="48" />
			<n8n-node-icon type="icon" name="cog" :size="48" />
			<n8n-node-icon type="unknown" node-type-name="" :size="48" color="red" />
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { N8nNodeIcon },
	template: `
		<div style="display: flex; gap: 24px; align-items: center;">
			<n8n-node-icon type="icon" name="cog" :size="24" />
			<n8n-node-icon type="icon" name="cog" :size="40" />
			<n8n-node-icon type="icon" name="cog" :size="64" />
			<n8n-node-icon type="icon" name="cog" :size="96" />
		</div>
	`,
});

export const FontIcon = DefaultTemplate.bind({});
FontIcon.args = {
	type: 'icon',
	name: 'cog',
	size: 40,
};

export const Hoverable = DefaultTemplate.bind({});
Hoverable.args = {
	type: 'icon',
	name: 'house',
	color: 'red',
	size: 40,
	nodeTypeName: 'We ❤️ n8n',
	showTooltip: true,
};

export const Unknown = DefaultTemplate.bind({});
Unknown.args = {
	type: 'unknown',
	nodeTypeName: 'Slack',
	size: 40,
	color: 'red',
};
