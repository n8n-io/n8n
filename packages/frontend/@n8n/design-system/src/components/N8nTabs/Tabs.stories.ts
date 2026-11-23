import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import type { TabOptions } from '../../types/tabs';
import N8nButton from '../N8nButton';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip';
import N8nTabs from './Tabs.vue';

export default {
	title: 'Core/Tabs',
	component: N8nTabs,
	argTypes: {
		variant: {
			control: 'select',
			options: ['underline', 'filled'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
		justified: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A tab navigation component for switching between content panels.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

type DefaultTab = 'overview' | 'usage' | 'accessibility';

const defaultTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Usage', value: 'usage' },
	{ label: 'Accessibility', value: 'accessibility' },
];

export const Default: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { args, val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Tabs let users switch between related views without leaving the page.
					Each tab shows one view at a time.
				</p>
				<p v-else-if="value === 'usage'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Use tabs for content at the same level of hierarchy.
					Keep labels short, and do not use more tabs than fit in one row.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Arrow keys move to a tab and select it.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Default.args = {
	variant: 'underline',
	size: 'medium',
	orientation: 'horizontal',
	justified: false,
};

const sharedArgs = {
	variant: 'underline',
	size: 'medium',
	orientation: 'horizontal',
	justified: false,
};

const overflowTabs: Array<TabOptions<string>> = [
	'Overview',
	'Executions',
	'Settings',
	'Credentials',
	'Variables',
	'Templates',
	'Members',
	'Billing',
	'Usage',
	'Security',
	'Logs',
	'Integrations',
	'Notifications',
	'Advanced',
].map((label) => ({ label, value: label.toLowerCase() }));

export const Overflow: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref('overview');
		return { args, val, options: overflowTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<div style="max-width: 480px;">
			<n8n-tabs
				v-model="val"
				:options="options"
				:variant="args.variant"
				:size="args.size"
				:orientation="args.orientation"
				:justified="args.justified"
				@update:model-value="onUpdateModelValue"
			>
				<template #content="{ value }">
					<p style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
						This is the {{ options.find((option) => option.value === value)?.label }} tab.
						The tab row is wider than its container, so use the arrow buttons to scroll.
					</p>
				</template>
			</n8n-tabs>
		</div>
	`,
});
Overflow.args = { ...sharedArgs };

type IconTab = 'home' | 'members' | 'settings';

const iconTabs: Array<TabOptions<IconTab>> = [
	{ label: 'Home', value: 'home', icon: 'house' },
	{ label: 'Members', value: 'members', icon: 'users', notification: true },
	{ label: 'Settings', value: 'settings', icon: 'settings' },
];

export const Icons: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<IconTab>('home');
		return { args, val, options: iconTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'home'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					See a summary of recent activity in the project.
				</p>
				<p v-else-if="value === 'members'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Add or remove the users who have access to the project.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Change the settings of the project.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Icons.args = { ...sharedArgs };

const sizeIconTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview', icon: 'house' },
	{ label: 'Usage', value: 'usage', icon: 'users' },
	{ label: 'Accessibility', value: 'accessibility', icon: 'eye' },
];

export const Justified: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		const iconValue = ref<DefaultTab>('overview');
		return { args, val, iconValue, options: defaultTabs, iconOptions: sizeIconTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<n8n-tabs
				v-model="val"
				:options="options"
				:variant="args.variant"
				:size="args.size"
				:orientation="args.orientation"
				:justified="args.justified"
				@update:model-value="onUpdateModelValue"
			>
				<template #content="{ value }">
					<p v-if="value === 'overview'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
						Justified tabs fill the full width of the container.
						Each tab gets the same width.
					</p>
					<p v-else-if="value === 'usage'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
						Use justified tabs when there are few tabs and the container is narrow.
					</p>
					<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
						Arrow keys move to a tab and select it.
					</p>
				</template>
			</n8n-tabs>
			<section style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
				<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					With Icons
				</h3>
				<n8n-tabs
					v-model="iconValue"
					:options="iconOptions"
					:variant="args.variant"
					:size="args.size"
					:orientation="args.orientation"
					justified
					@update:model-value="onUpdateModelValue"
				/>
			</section>
		</div>
	`,
});
Justified.args = { ...sharedArgs, justified: true };

export const Vertical: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { args, val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Vertical tabs show the tab list in a column next to the content.
				</p>
				<p v-else-if="value === 'usage'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Use vertical tabs for settings pages or when there are many tabs.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The Up and Down arrow keys move to a tab and select it.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Vertical.args = { ...sharedArgs, orientation: 'vertical' };

export const ControlledUncontrolled: StoryFn = () => ({
	components: { N8nButton, N8nTabs },
	setup() {
		const value = ref<DefaultTab>('overview');
		return { value, options: defaultTabs };
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<section style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
				<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Controlled
				</h3>
				<n8n-tabs v-model="value" :options="options" />
				<div style="display: flex; gap: var(--spacing--2xs); flex-wrap: wrap;">
					<n8n-button
						v-for="option in options"
						:key="option.value"
						size="small"
						variant="outline"
						@click="value = option.value"
					>
						{{ option.label }}
					</n8n-button>
				</div>
			</section>
			<section style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
				<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Uncontrolled
				</h3>
				<n8n-tabs default-value="overview" :options="options" />
			</section>
		</div>
	`,
});
ControlledUncontrolled.storyName = 'Controlled / Uncontrolled';

const sectionHeading =
	'margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);';

const tabSizes = ['small', 'medium', 'large'] as const;

export const Sizes: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const underline = reactive<Record<(typeof tabSizes)[number], DefaultTab>>({
			small: 'overview',
			medium: 'overview',
			large: 'overview',
		});
		const filled = reactive<Record<(typeof tabSizes)[number], DefaultTab>>({
			small: 'overview',
			medium: 'overview',
			large: 'overview',
		});
		const underlineIcons = reactive<Record<(typeof tabSizes)[number], DefaultTab>>({
			small: 'overview',
			medium: 'overview',
			large: 'overview',
		});
		const filledIcons = reactive<Record<(typeof tabSizes)[number], DefaultTab>>({
			small: 'overview',
			medium: 'overview',
			large: 'overview',
		});
		return {
			sizes: tabSizes,
			underline,
			filled,
			underlineIcons,
			filledIcons,
			options: defaultTabs,
			iconOptions: sizeIconTabs,
			sectionHeading,
		};
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
		sizeLabel(size: (typeof tabSizes)[number]) {
			if (size === 'small') return 'Small';
			if (size === 'large') return 'Large';
			return 'Medium';
		},
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<section style="display: flex; flex-direction: column; gap: var(--spacing--md);">
				<h3 :style="sectionHeading">Underline</h3>
				<div
					v-for="size in sizes"
					:key="'underline-' + size"
					style="display: flex; flex-direction: column; gap: var(--spacing--sm);"
				>
					<h4 :style="sectionHeading">{{ sizeLabel(size) }}</h4>
					<n8n-tabs
						v-model="underline[size]"
						variant="underline"
						:size="size"
						:options="options"
						@update:model-value="onUpdateModelValue"
					/>
					<n8n-tabs
						v-model="underlineIcons[size]"
						variant="underline"
						:size="size"
						:options="iconOptions"
						@update:model-value="onUpdateModelValue"
					/>
				</div>
			</section>
			<section style="display: flex; flex-direction: column; gap: var(--spacing--md);">
				<h3 :style="sectionHeading">Filled</h3>
				<div
					v-for="size in sizes"
					:key="'filled-' + size"
					style="display: flex; flex-direction: column; gap: var(--spacing--sm);"
				>
					<h4 :style="sectionHeading">{{ sizeLabel(size) }}</h4>
					<n8n-tabs
						v-model="filled[size]"
						variant="filled"
						:size="size"
						:options="options"
						@update:model-value="onUpdateModelValue"
					/>
					<n8n-tabs
						v-model="filledIcons[size]"
						variant="filled"
						:size="size"
						:options="iconOptions"
						@update:model-value="onUpdateModelValue"
					/>
				</div>
			</section>
		</div>
	`,
});

export const Filled: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs v-model="val" variant="filled" :options="options" @update:model-value="onUpdateModelValue">
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The filled variant marks the active tab with a background.
				</p>
				<p v-else-if="value === 'usage'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Use filled tabs when the bar sits on a surface and an underline is hard to see.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Arrow keys move to a tab and select it.
				</p>
			</template>
		</n8n-tabs>
	`,
});

const disabledTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview' },
	{
		label: 'Usage',
		value: 'usage',
		disabled: true,
		tooltip: 'You need editor access to open usage.',
	},
	{ label: 'Accessibility', value: 'accessibility' },
];

export const Disabled: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { val, options: disabledTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
		onTooltipClick: action('tooltipClick'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			@update:model-value="onUpdateModelValue"
			@tooltip-click="onTooltipClick"
		>
			<template #content>
				<p style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The Usage tab is disabled. Hover it to read why.
				</p>
			</template>
		</n8n-tabs>
	`,
});

const tooltipTabs: Array<TabOptions<DefaultTab>> = [
	{
		label: 'Overview',
		value: 'overview',
		tooltip: 'A summary of recent activity. <button type="button">Send feedback</button>',
	},
	{ label: 'Usage', value: 'usage', tooltip: 'Executions from the last 7 days.' },
	{ label: 'Accessibility', value: 'accessibility' },
];

export const Tooltip: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { val, options: tooltipTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
		onTooltipClick: action('tooltipClick'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			@update:model-value="onUpdateModelValue"
			@tooltip-click="onTooltipClick"
		>
			<template #content>
				<p style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Hover a tab to read its tooltip. Click Send feedback to emit tooltipClick.
				</p>
			</template>
		</n8n-tabs>
	`,
});

type IconSideTab = 'home' | 'members' | 'settings';

const iconRightTabs: Array<TabOptions<IconSideTab>> = [
	{ label: 'Home', value: 'home', icon: 'house', iconPosition: 'right' },
	{ label: 'Members', value: 'members', icon: 'users', iconPosition: 'right' },
	{ label: 'Settings', value: 'settings', icon: 'settings', iconPosition: 'right' },
];

export const IconPosition: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<IconSideTab>('home');
		return { val, options: iconRightTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
			<template #content>
				<p style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The icon sits after the label when iconPosition is right.
				</p>
			</template>
		</n8n-tabs>
	`,
});
IconPosition.storyName = 'Icon Position';

type IconColorTab = 'alerts' | 'limits' | 'checks';

const iconColorTabs: Array<TabOptions<IconColorTab>> = [
	{ label: 'Alerts', value: 'alerts', icon: 'triangle-alert', iconColor: 'danger' },
	{ label: 'Limits', value: 'limits', icon: 'circle-alert', iconColor: 'warning' },
	{ label: 'Checks', value: 'checks', icon: 'circle-check', iconColor: 'success' },
];

export const IconColor: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<IconColorTab>('alerts');
		return { val, options: iconColorTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
			<template #content="{ value }">
				<p v-if="value === 'alerts'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The icon color does not change the label color.
				</p>
				<p v-else-if="value === 'limits'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Use warning when a limit is close.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Use success when the checks passed.
				</p>
			</template>
		</n8n-tabs>
	`,
});
IconColor.storyName = 'Icon Color';

const alignedTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Usage', value: 'usage' },
	{ label: 'Settings', value: 'settings', align: 'right' },
];

export const Aligned: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { val, options: alignedTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
			<template #content="{ value }">
				<p v-if="value === 'settings'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					Settings uses align right, so it sits at the end of the list.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The other tabs stay at the start.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Aligned.storyName = 'Align Right';

type RouteTab = 'overview' | 'docs';

const routeTabs: Array<TabOptions<RouteTab>> = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Docs', value: 'docs', to: '/docs' },
];

export const RouteLink: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const route = useRoute();
		const val = ref<RouteTab>('overview');
		return { val, options: routeTabs, route };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
			<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
				<template #content>
					<p style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
						Docs is a route. A click opens the page and does not select the tab.
					</p>
				</template>
			</n8n-tabs>
			<p style="margin: 0; font-size: var(--font-size--sm);">Selected tab: {{ val }}</p>
			<p style="margin: 0; font-size: var(--font-size--sm);">Current page: {{ route.path }}</p>
		</div>
	`,
});
RouteLink.storyName = 'Route Link';

type BadgeTab = 'editor' | 'executions' | 'insights';

const badgeTabs: Array<TabOptions<BadgeTab>> = [
	{ label: 'Editor', value: 'editor' },
	{ label: 'Executions', value: 'executions', tag: '12' },
	{ label: 'Insights', value: 'insights', preview: true },
];

export const Badges: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		const val = ref<BadgeTab>('editor');
		return { val, options: badgeTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
			<template #content="{ value }">
				<p v-if="value === 'executions'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The tag shows a badge after the label.
				</p>
				<p v-else-if="value === 'insights'" style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The preview prop shows a preview badge after the label.
				</p>
				<p v-else style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					A tab can show a count, a preview badge, or neither.
				</p>
			</template>
		</n8n-tabs>
	`,
});

export const Suffix: StoryFn = () => ({
	components: { N8nButton, N8nIconButton, N8nTabs, N8nTooltip },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
		onDocsClick: action('docs'),
		onFilterClick: action('filter'),
		onSettingsClick: action('settings'),
	},
	template: `
		<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
			<template #suffix>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<n8n-button size="small" variant="outline" @click="onDocsClick">Docs</n8n-button>
					<n8n-tooltip content="Filter" placement="top" as-child>
						<n8n-icon-button
							icon="filter"
							size="small"
							variant="outline"
							aria-label="Filter"
							@click="onFilterClick"
						/>
					</n8n-tooltip>
					<n8n-tooltip content="Settings" placement="top" as-child>
						<n8n-icon-button
							icon="settings"
							size="small"
							variant="outline"
							aria-label="Settings"
							@click="onSettingsClick"
						/>
					</n8n-tooltip>
				</div>
			</template>
			<template #content>
				<p style="padding-block: var(--spacing--sm); font-size: var(--font-size--sm);">
					The suffix sits after the tab list. Use it for actions and links.
				</p>
			</template>
		</n8n-tabs>
	`,
});
