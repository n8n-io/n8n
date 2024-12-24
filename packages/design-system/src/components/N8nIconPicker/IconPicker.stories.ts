import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import { TEST_ICONS } from './constants';
import N8nIconPicker from './IconPicker.vue';

export default {
	title: 'Atoms/Icon Picker',
	component: N8nIconPicker,
	argTypes: {},
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	components: { N8nIconPicker },
	props: Object.keys(argTypes),
	setup: () => ({ args }),
	data: () => ({
		icon: { type: 'icon', value: 'smile' },
	}),
	template:
		'<div style="height: 500px"><n8n-icon-picker v-model="icon" v-bind="args" @update:model-value="onIconSelected" /></div>',
	methods: {
		onIconSelected: action('iconSelected'),
	},
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	buttonTooltip: 'Select an icon',
	availableIcons: TEST_ICONS,
};

const CustomTooltipTemplate: StoryFn = (args, { argTypes }) => ({
	components: { N8nIconPicker },
	props: Object.keys(argTypes),
	setup: () => ({ args }),
	data: () => ({
		icon: { type: 'icon', value: 'layer-group' },
	}),
	template:
		'<div style="height: 500px"><n8n-icon-picker v-model="icon" v-bind="args" @update:model-value="onIconSelected" /></div>',
	methods: {
		onIconSelected: action('iconSelected'),
	},
});

export const WithCustomIconAndTooltip = CustomTooltipTemplate.bind({});
WithCustomIconAndTooltip.args = {
	availableIcons: [...TEST_ICONS],
	buttonTooltip: 'Select something...',
};

const OnlyEmojiTemplate: StoryFn = (args, { argTypes }) => ({
	components: { N8nIconPicker },
	props: Object.keys(argTypes),
	setup: () => ({ args }),
	data: () => ({
		icon: { type: 'emoji', value: '🔥' },
	}),
	template:
		'<div style="height: 500px"><n8n-icon-picker v-model="icon" v-bind="args" @update:model-value="onIconSelected" /></div>',
	methods: {
		onIconSelected: action('iconSelected'),
	},
});
export const OnlyEmojis = OnlyEmojiTemplate.bind({});
OnlyEmojis.args = {
	buttonTooltip: 'Select an emoji',
	availableIcons: [],
};
