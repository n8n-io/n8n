import N8nMenu from './Menu.vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import type { StoryFn } from '@storybook/vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Menu',
	component: N8nMenu,
	argTypes: {},
};

const methods = {
	onSelect: action('select'),
};

const template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
	},
	template: `
		<div style="height: 90vh; width: 200px">
			<n8n-menu v-bind="$props" @select="onSelect"></n8n-menu>
		</div>
	`,
	methods,
});

const templateWithHeaderAndFooter: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
		N8nIcon,
		N8nText,
	},
	template: `
		<div style="height: 90vh; width: 200px">
			<n8n-menu v-bind="$props" @select="onSelect">
				<template #header>
					<a href="#" class="p-m hideme" style="display: block;">
						<n8n-icon icon="long-arrow-alt-left"/>&nbsp;&nbsp;Back to home
					</a>
				</template>
				<template #footer>
					<div class="p-m hideme">
						<n8n-icon icon="user-circle" size="xlarge"/>&nbsp;&nbsp;
						<n8n-text>John Smithson</n8n-text>
					</div>
				</template>
			</n8n-menu>
		</div>
	`,
	methods,
});

const templateWithAllSlots: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
		N8nIcon,
		N8nText,
	},
	template: `
		<div style="height: 90vh; width: 200px">
			<n8n-menu v-bind="$props" @select="onSelect">
				<template #header>
					<a href="#" class="p-m hideme" style="display: block;">
						<n8n-icon icon="long-arrow-alt-left"/>&nbsp;&nbsp;Back to home
					</a>
				</template>
				<template #menuPrefix>
					<n8n-text class="hideme" size="small"  color="text-light">Something can be added here...</n8n-text>
				</template>
				<template #menuSuffix>
					<n8n-text class="hideme" size="small" color="text-light">...and here if needed</n8n-text>
				</template>
				<template #footer>
					<div class="p-m hideme">
						<n8n-icon icon="user-circle" size="xlarge"/>&nbsp;&nbsp;
						<n8n-text>John Smithson</n8n-text>
					</div>
				</template>
			</n8n-menu>
		</div>
	`,
	methods,
});

const menuItems = [
	{
		id: 'workflows',
		icon: 'network-wired',
		label: 'Workflows',
		position: 'top',
	},
	{
		id: 'executions',
		icon: 'tasks',
		label: 'Executions',
		position: 'top',
	},
	{
		id: 'disabled-item',
		icon: 'times',
		label: 'Not Available',
		available: false,
		position: 'top',
	},
	{
		id: 'website',
		icon: 'globe',
		label: 'Website',
		type: 'link',
		properties: {
			href: 'https://www.n8n.io',
			newWindow: true,
		},
		position: 'bottom',
	},
	{
		id: 'help',
		icon: 'question',
		label: 'Help',
		position: 'bottom',
		children: [
			{ icon: 'info', label: 'About n8n', id: 'about' },
			{ icon: 'book', label: 'Documentation', id: 'docs' },
			{
				id: 'disabled-submenu-item',
				icon: 'times',
				label: 'Not Available',
				available: false,
				position: 'top',
			},
			{
				id: 'quickstart',
				icon: 'video',
				label: 'Quickstart',
				type: 'link',
				properties: {
					href: 'https://www.youtube.com/watch?v=RpjQTGKm-ok',
					newWindow: true,
				},
			},
		],
	},
];

export const primary = template.bind({});
primary.args = {
	items: menuItems,
};

export const withHeaderAndFooter = templateWithHeaderAndFooter.bind({});
withHeaderAndFooter.args = { items: menuItems };

export const withAllSlots = templateWithAllSlots.bind({});
withAllSlots.args = { items: menuItems };
