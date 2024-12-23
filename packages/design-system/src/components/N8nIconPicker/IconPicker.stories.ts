import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import { TEST_ICONS } from './constants';
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
	defaultIcon: { type: 'icon', value: 'smile' },
	buttonTooltip: 'Select an icon',
	availableIcons: TEST_ICONS,
};

export const WithCustomIconAndTooltip = Template.bind({});
WithCustomIconAndTooltip.args = {
	defaultIcon: { type: 'icon', value: 'layer-group' },
	availableIcons: [...TEST_ICONS],
	buttonTooltip: 'Select something...',
};

export const OnlyEmojis = Template.bind({});
OnlyEmojis.args = {
	defaultIcon: { type: 'emoji', value: '😁' },
	buttonTooltip: 'Select an emoji',
	availableIcons: [],
};
