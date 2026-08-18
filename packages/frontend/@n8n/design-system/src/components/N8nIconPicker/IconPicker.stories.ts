import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nIconPicker from './IconPicker.vue';
import type { IconOrEmoji } from './types';

export default {
	title: 'Core/Icon Picker',
	component: N8nIconPicker,
	argTypes: {
		buttonTooltip: {
			control: 'text',
		},
		buttonSize: {
			control: 'select',
			options: ['small', 'large', 'xlarge'],
		},
		buttonVariant: {
			control: 'select',
			options: ['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'],
		},
		isReadOnly: {
			control: 'boolean',
		},
		iconsOnly: {
			control: 'boolean',
		},
		showColorPicker: {
			control: 'boolean',
		},
		containerClass: {
			control: 'text',
		},
		buttonClass: {
			control: 'text',
		},
		defaultTab: {
			control: 'select',
			options: ['icons', 'emojis'],
		},
	},
	parameters: {
		docs: {
			description: { component: 'A searchable selector for browsing and choosing icons.' },
		},
	},
};

function createTemplate(icon: IconOrEmoji): StoryFn {
	return function renderStory(args, { argTypes }) {
		return {
			components: { N8nIconPicker },
			props: Object.keys(argTypes),
			setup() {
				return { args };
			},
			data() {
				return { icon };
			},
			template:
				'<div style="height: 240px"><n8n-icon-picker v-model="icon" v-bind="args" @update:model-value="onIconSelected" /></div>',
			methods: {
				onIconSelected: action('iconSelected'),
			},
		};
	};
}

const DefaultTemplate = createTemplate({ type: 'icon', value: 'smile' });
export const Default = DefaultTemplate.bind({});
Default.args = {
	buttonTooltip: 'Select an icon',
};

const CustomTooltipTemplate = createTemplate({ type: 'icon', value: 'layers' });
export const WithCustomIconAndTooltip = CustomTooltipTemplate.bind({});
WithCustomIconAndTooltip.args = {
	buttonTooltip: 'Select something...',
};

const EmojiTemplate = createTemplate({ type: 'emoji', value: '🔥' });
export const WithEmoji = EmojiTemplate.bind({});
WithEmoji.args = {
	buttonTooltip: 'Select an emoji',
};

const IconsOnlyTemplate = createTemplate({ type: 'icon', value: 'smile' });
export const IconsOnly = IconsOnlyTemplate.bind({});
IconsOnly.args = {
	buttonTooltip: 'Select an icon',
	iconsOnly: true,
};

const ColorPickerTemplate = createTemplate({ type: 'icon', value: 'palette' });
export const WithColorPicker = ColorPickerTemplate.bind({});
WithColorPicker.args = {
	buttonTooltip: 'Select an icon color',
	showColorPicker: true,
};
