import type { StoryFn } from '@storybook/vue3-vite';

import N8nNodeIcon from './NodeIcon.vue';

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

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nNodeIcon,
	},
	template: '<n8n-node-icon v-bind="args"></n8n-node-icon>',
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	type: 'file',
	src: 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/cartman.svg',
	size: 200,
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
	size: 200,
};

export const Hoverable = DefaultTemplate.bind({});
Hoverable.args = {
	type: 'icon',
	name: 'home',
	color: 'red',
	size: 200,
	nodeTypeName: 'We ❤️ n8n',
	showTooltip: true,
};

export const Unknown = DefaultTemplate.bind({});
Unknown.args = {
	type: 'unknown',
	nodeTypeName: '',
	size: 40,
	color: 'red',
};
