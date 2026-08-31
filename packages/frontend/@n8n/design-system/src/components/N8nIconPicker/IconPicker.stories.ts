import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nIconPicker from './IconPicker.vue';
import { type IconOrEmoji } from './types';

export default {
	title: 'Core/IconPicker',
	component: N8nIconPicker,
	argTypes: {
		buttonTooltip: {
			control: 'text',
		},
		buttonSize: {
			type: 'select',
			options: ['small', 'large'],
		},
	},

	parameters: {
		docs: {
			description: { component: 'A searchable selector for browsing and choosing icons.' },
		},
	},
};

function createTemplate(icon: IconOrEmoji): StoryFn {
	return (args, { argTypes }) => ({
		components: { N8nIconPicker },
		props: Object.keys(argTypes),
		setup: () => ({ args }),
		data: () => ({
			icon,
		}),
		template:
			'<n8n-icon-picker v-model="icon" v-bind="args" @update:model-value="onIconSelected" />',
		methods: {
			onIconSelected: action('iconSelected'),
		},
	});
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

const OnlyEmojiTemplate = createTemplate({ type: 'emoji', value: '🔥' });
export const OnlyEmojis = OnlyEmojiTemplate.bind({});
OnlyEmojis.args = {
	buttonTooltip: 'Select an emoji',
	availableIcons: [],
};
