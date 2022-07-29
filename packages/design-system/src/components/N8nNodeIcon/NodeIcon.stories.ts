/* tslint:disable:variable-name */
import N8nNodeIcon from "./NodeIcon.vue";
import { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/NodeIcon',
	component: N8nNodeIcon,
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nNodeIcon,
	},
	template: '<n8n-node-icon v-bind="$props"></n8n-node-icon>',
});

export const FileIcon = DefaultTemplate.bind({});
FileIcon.args = {
	type: 'file',
	src: 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/cartman.svg',
	size: 200,
};

export const FontIcon = DefaultTemplate.bind({});
FontIcon.args = {
	type: 'icon',
	name: 'cogs',
	size: 200,
};

export const Hoverable = DefaultTemplate.bind({});
Hoverable.args = {
	type: 'icon',
	name: 'heart',
	color: 'red',
	size: 200,
	nodeTypeName: 'We ❤️ n8n',
	showTooltip: true,
};
