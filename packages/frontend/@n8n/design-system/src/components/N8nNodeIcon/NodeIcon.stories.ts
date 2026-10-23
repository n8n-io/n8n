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

const svgIcon = (width: number, height: number) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="2" fill="#ff6d5a"/></svg>`,
	)}`;

// File icons declare their own size. Each one must fit the slot, whatever size it declares.
export const FileIconScaling: StoryFn = () => ({
	components: { N8nNodeIcon },
	setup: () => ({
		icons: [
			{ label: 'small 14×20', src: svgIcon(14, 20) },
			{ label: 'tall 20×60', src: svgIcon(20, 60) },
			{ label: 'wide 60×20', src: svgIcon(60, 20) },
			{ label: 'large 100×100', src: svgIcon(100, 100) },
		],
		sizes: [20, 40],
	}),
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px; font-family: sans-serif; font-size: 13px;">
			<p style="margin: 0; max-width: 560px;">
				Each dashed box is the icon slot (<code>size</code>). Each orange shape is a file icon
				that declares the size in its column header.
				<br />Expected: every shape touches the box on two opposite sides and never overflows it.
				Small icons scale up, large icons scale down, and the aspect ratio stays the same.
				The tooltip rows must look the same as the rows above them.
			</p>
			<div style="display: grid; grid-template-columns: repeat(5, auto); gap: 16px; align-items: center; justify-content: start; justify-items: start;">
				<span />
				<strong v-for="icon in icons" :key="icon.label">{{ icon.label }}</strong>
				<template v-for="size in sizes" :key="size">
					<template v-for="showTooltip in [false, true]" :key="showTooltip">
						<span>{{ size }}px slot{{ showTooltip ? ', with tooltip' : '' }}</span>
						<div v-for="icon in icons" :key="icon.label" style="outline: 1px dashed #999;">
							<n8n-node-icon type="file" :src="icon.src" :size="size" :show-tooltip="showTooltip" :node-type-name="icon.label" />
						</div>
					</template>
				</template>
			</div>
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
