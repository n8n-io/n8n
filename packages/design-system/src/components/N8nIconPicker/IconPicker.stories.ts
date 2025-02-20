import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import { TEST_ICONS } from './constants';
import type { Icon } from './IconPicker.vue';
import N8nIconPicker from './IconPicker.vue';

export default {
	title: 'Atoms/Icon Picker',
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
};

function createTemplate(icon: Icon): StoryFn {
	return (args, { argTypes }) => ({
		components: { N8nIconPicker },
		props: Object.keys(argTypes),
		setup: () => ({ args }),
		data: () => ({
			icon,
		}),
		template:
			'<div style="height: 500px"><n8n-icon-picker v-model="icon" v-bind="args" @update:model-value="onIconSelected" /></div>',
		methods: {
			onIconSelected: action('iconSelected'),
		},
	});
}

const DefaultTemplate = createTemplate({ type: 'icon', value: 'smile' });
export const Default = DefaultTemplate.bind({});
Default.args = {
	buttonTooltip: 'Select an icon',
	availableIcons: TEST_ICONS,
};

const CustomTooltipTemplate = createTemplate({ type: 'icon', value: 'layer-group' });
export const WithCustomIconAndTooltip = CustomTooltipTemplate.bind({});
WithCustomIconAndTooltip.args = {
	availableIcons: [...TEST_ICONS],
	buttonTooltip: 'Select something...',
};

const OnlyEmojiTemplate = createTemplate({ type: 'emoji', value: '🔥' });
export const OnlyEmojis = OnlyEmojiTemplate.bind({});
OnlyEmojis.args = {
	buttonTooltip: 'Select an emoji',
	availableIcons: [],
};
