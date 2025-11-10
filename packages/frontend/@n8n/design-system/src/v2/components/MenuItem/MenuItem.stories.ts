import type { StoryFn } from '@storybook/vue3-vite';

import N8nIconButton from '@n8n/design-system/components/N8nIconButton';
import type { IMenuItem } from '@n8n/design-system/types/menu';

import MenuItem from './MenuItem.vue';

export default {
	title: 'V2/Atoms/MenuItem',
	component: MenuItem,
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { MenuItem },
	template: '<div style="max-width: 220px; margin: 20px auto;"><MenuItem v-bind="args" /></div>',
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

export const AsButton = Template.bind({});
AsButton.args = {
	as: 'button',
	type: 'button',
	item: {
		id: 'item1',
		label: 'Button Item',
		icon: 'layers',
		size: 'medium',
	} as IMenuItem,
};

export const AsLink = Template.bind({});
AsLink.args = {
	as: 'a',
	href: '#',
	target: '_blank',
	item: {
		id: 'item1',
		label: 'Link Item',
		icon: 'external-link',
		size: 'medium',
	} as IMenuItem,
};

export const Collapsed = Template.bind({});
Collapsed.args = {
	item: {
		id: 'item1',
		label: 'Item label',
		icon: 'layers',
		size: 'medium',
	} as IMenuItem,
	collapsed: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
	item: {
		id: 'item1',
		label: 'Item label',
		icon: 'layers',
		size: 'medium',
		disabled: true,
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

export const SecondaryIcon = Template.bind({});
SecondaryIcon.args = {
	item: {
		id: 'item1',
		label: 'Help',
		icon: 'circle-help',
		size: 'medium',
		notification: true,
		secondaryIcon: {
			name: 'chevron-right',
		},
	} as IMenuItem,
};

const SlotsFilled: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { MenuItem, N8nIconButton },
	template: `<div style="max-width: 220px; margin: 20px auto;"><MenuItem v-bind="args">
			<template #toggle>
				<N8nIconButton
					size="mini"
					type="highlight"
					icon="chevron-right"
					icon-size="medium"
					aria-label="Go to details"
				/>
			</template>
			<template #actions>
				<N8nIconButton
					size="mini"
					type="highlight"
					icon="ellipsis"
					icon-size="medium"
					aria-label="Go to details"
				/>
				<N8nIconButton
					size="mini"
					type="highlight"
					icon="plus"
					icon-size="medium"
					aria-label="Go to details"
				/>
			</template>
</MenuItem></div>`,
});

export const WithSlots = SlotsFilled.bind({});
WithSlots.args = {
	item: {
		id: 'item1',
		label: 'Item label',
		icon: 'layers',
		size: 'medium',
	} as IMenuItem,
};
