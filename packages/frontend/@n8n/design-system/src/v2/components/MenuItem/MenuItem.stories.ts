import type { StoryFn } from '@storybook/vue3-vite';

import type { IMenuItem } from '@n8n/design-system/types/menu';

import MenuItem from './MenuItem.vue';

export default {
	title: 'V2/Atoms/MenuItem',
	component: MenuItem,
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { MenuItem },
	template: '<MenuItem v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	item: {
		id: 'item1',
		label: 'Item label',
		icon: 'layers',
		size: 'medium',
	} as IMenuItem,
};

export const EmojiAsIcon = Template.bind({});
EmojiAsIcon.args = {
	item: {
		id: 'item1',
		label: 'Item label',
		icon: {
			type: 'emoji',
			value: '💩',
		},
		size: 'medium',
	} as IMenuItem,
};

const SlotsFilled: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { MenuItem },
	template: `<MenuItem v-bind="args">
	<template #chevron-button>
		<div style="width: 24px; height: 24px; background-color: red;"></div>
	</template>
		<template #secondary>
		<div style="width: 24px; height: 24px; background-color: blue;"></div>
	</template>
	<template #tertiary>
		<div style="width: 24px; height: 24px; background-color: green;"></div>
	</template>
</MenuItem>`,
});

export const WithChevronButtonSlot = SlotsFilled.bind({});
WithChevronButtonSlot.args = {
	item: {
		id: 'item1',
		label: 'Item label',
		icon: 'layers',
		size: 'medium',
	} as IMenuItem,
};
