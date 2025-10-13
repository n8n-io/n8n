import type { StoryFn } from '@storybook/vue3-vite';

import N8nNodeCreatorNode from './NodeCreatorNode.vue';

export default {
	title: 'Modules/Node Creator Node',
	component: N8nNodeCreatorNode,
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nNodeCreatorNode,
	},
	template: `
		<n8n-node-creator-node v-bind="args">
			<template #icon>
				<img src="https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/cartman.svg" />
			</template>
		</n8n-node-creator-node>
	`,
});

export const WithTitle = DefaultTemplate.bind({});
WithTitle.args = {
	title: 'Node with title',
	tooltipHtml: '<b>Bold</b> tooltip',
	description:
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean et vehicula ipsum, eu facilisis lacus. Aliquam commodo vel elit eget mollis. Quisque ac elit non purus iaculis placerat. Quisque fringilla ultrices nisi sed porta.',
};

const PanelTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nNodeCreatorNode,
	},
	data() {
		return {
			isPanelActive: false,
		};
	},
	template: `
		<n8n-node-creator-node v-bind="args" :isPanelActive="isPanelActive" @click.capture="isPanelActive = true">
			<template #icon>
				<img src="https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/cartman.svg" />
			</template>
			<template #panel>
				<p style="width: 100%; height: 300px; background: white">Lorem ipsum dolor sit amet</p>
				<button @click="isPanelActive = false">Close</button>
			</template>
		</n8n-node-creator-node>
	`,
});
export const WithPanel = PanelTemplate.bind({});
WithPanel.args = {
	title: 'Node with panel',
	isTrigger: true,
};
