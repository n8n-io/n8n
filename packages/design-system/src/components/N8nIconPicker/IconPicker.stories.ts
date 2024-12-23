import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import { allIcons } from './constants';
import N8nIconPicker from './IconPicker.vue';

export default {
	title: 'Atoms/IconPicker',
	component: N8nIconPicker,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	components: { N8nIconPicker },
	props: Object.keys(argTypes),
	setup: () => ({ args }),
	template:
		'<div style="height: 500px"><n8n-icon-picker v-bind="args" @iconSelected="onIconSelected" /></div>',
	methods: {
		onIconSelected: action('iconSelected'),
	},
});

export const Default = Template.bind({});
Default.args = {
	availableIcons: allIcons,
};

export const WithCustomIconAndTooltip = Template.bind({});
WithCustomIconAndTooltip.args = {
	defaultIcon: 'layer-group',
	availableIcons: [...allIcons],
	buttonTooltip: 'Select something...',
};

export const OnlyEmojis = Template.bind({});
OnlyEmojis.args = {
	availableIcons: [],
};
