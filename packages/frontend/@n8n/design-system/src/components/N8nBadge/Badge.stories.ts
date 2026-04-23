import type { StoryFn } from '@storybook/vue3-vite';

import N8nBadge from './Badge.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nTag from '../N8nTag/Tag.vue';
import N8nTags from '../N8nTags/Tags.vue';
import Tooltip from '../N8nTooltip/Tooltip.vue';
import { BADGE_THEME } from '@n8n/design-system/types/badge';

const SIZE_OPTIONS = ['small', 'medium', 'large'] as const;

export default {
	title: 'Core/Badge',
	component: N8nBadge,
	argTypes: {
		text: {
			control: {
				control: 'text',
			},
		},
		theme: {
			control: 'select',
			options: BADGE_THEME,
		},
		size: {
			control: 'select',
			options: SIZE_OPTIONS,
		},
	},
	parameters: {
		docs: {
			description: { component: 'A compact status label for highlighting state or metadata.' },
		},
	},
};

const SingleBadgeTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nBadge,
	},
	template: '<n8n-badge v-bind="args"></n8n-badge>',
});

export const SingleBadge = SingleBadgeTemplate.bind({});
SingleBadge.args = {
	text: 'Badge',
	theme: 'default',
	size: 'small',
};

const ThemeListTemplate: StoryFn = () => ({
	setup: () => ({ themes: BADGE_THEME }),
	components: {
		N8nBadge,
	},
	template: `
		<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
			<n8n-badge v-for="theme in themes" :key="theme" :theme="theme">Badge</n8n-badge>
		</div>
	`,
});

export const Theme = ThemeListTemplate.bind({});

const SizeListTemplate: StoryFn = () => ({
	setup: () => ({ sizes: SIZE_OPTIONS }),
	components: {
		N8nBadge,
	},
	template: `
		<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
			<n8n-badge v-for="size in sizes" :key="size" :size="size" theme="default">Badge</n8n-badge>
		</div>
	`,
});

export const Sizes = SizeListTemplate.bind({});

const IconAndTextSlotsTemplate: StoryFn = () => ({
	components: {
		N8nBadge,
		N8nIcon,
	},
	template: `
		<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
			<n8n-badge theme="blue" text="Syncing">
				<template #leading>
					<n8n-icon icon="info" size="small" />
				</template>
				<template #trailing>
					<n8n-icon icon="refresh-cw" size="small" />
				</template>
			</n8n-badge>
			<n8n-badge theme="green" text="Ready">
				<template #leading>
					<n8n-icon icon="check" size="small" />
				</template>
			</n8n-badge>
			<n8n-badge theme="orange" text="Scheduled">
				<template #leading>
					<n8n-icon icon="clock" size="small" />
				</template>
				<template #trailing>
					<n8n-icon icon="chevron-right" size="small" />
				</template>
			</n8n-badge>
		</div>
	`,
});

export const IconAndTextSlots = IconAndTextSlotsTemplate.bind({});

const LongLabelWithTooltipTemplate: StoryFn = () => ({
	setup: () => ({
		longLabel: 'This is a very long badge label that should be fully readable on hover',
	}),
	components: {
		N8nBadge,
		Tooltip,
	},
	template: `
		<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; max-width: 260px;">
			<p style="margin: 0; font-size: 12px; line-height: 1.4; color: var(--text-color--subtle);">
				If a badge name is long, wrap it with a tooltip showing the full label.
			</p>
			<Tooltip :content="longLabel" placement="top">
				<n8n-badge>
					<span style="display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
						{{ longLabel }}
					</span>
				</n8n-badge>
			</Tooltip>
		</div>
	`,
});

export const LongLabelWithTooltip = LongLabelWithTooltipTemplate.bind({});

const SingleTagTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nTag,
	},
	template: '<n8n-tag v-bind="args"></n8n-tag>',
});

export const SingleTag = SingleTagTemplate.bind({});
SingleTag.args = {
	text: 'tag name',
};

const TagListTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nTags,
	},
	template: '<n8n-tags v-bind="args"></n8n-tags>',
});

export const TagList = TagListTemplate.bind({});
TagList.args = {
	tags: [
		{
			id: 1,
			name: 'very long tag name',
		},
		{
			id: 2,
			name: 'tag1',
		},
		{
			id: 3,
			name: 'tag2 yo',
		},
	],
};

export const TruncatedTagList = TagListTemplate.bind({});
TruncatedTagList.args = {
	truncate: true,
	tags: [
		{
			id: 1,
			name: 'very long tag name',
		},
		{
			id: 2,
			name: 'tag1',
		},
		{
			id: 3,
			name: 'tag2 yo',
		},
		{
			id: 4,
			name: 'tag3',
		},
		{
			id: 5,
			name: 'tag4',
		},
	],
};
