import type { StoryFn } from '@storybook/vue3-vite';

import N8nIcon from '../N8nIcon/Icon.vue';
import N8nNodeCreatorNode from './NodeCreatorNode.vue';

export default {
	title: 'Core/NodeCreatorNode',
	component: N8nNodeCreatorNode,

	parameters: {
		docs: {
			description: {
				component: 'A node list item for the node creator with icon, title, and metadata.',
			},
		},
	},
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
		N8nNodeCreatorNode,
	},
	template: `
		<n8n-node-creator-node v-bind="args">
			<template #icon>
				<img src="https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/cartman.svg" />
			</template>
			<template v-if="args.disabled" #trailing>
				<n8n-icon icon="lock" size="small" title="Restricted" />
			</template>
		</n8n-node-creator-node>
	`,
});

export const Default = DefaultTemplate.bind({});
Default.args = {
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

export const Restricted = DefaultTemplate.bind({});
Restricted.args = {
	title: 'Gmail',
	description: 'Fetches emails from Gmail and starts the workflow on specified polling intervals.',
	disabled: true,
};
Restricted.parameters = {
	docs: {
		description: {
			story:
				'A node type a policy blocks. `disabled` fades the icon and text; the `trailing` slot keeps the lock at full strength. Rendered in the nodes panel by `NodeItem.vue`, which also anchors the explanation popover to the row.',
		},
	},
};
