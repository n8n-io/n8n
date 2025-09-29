import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nMenu from './Menu.vue';
import N8nCallout from '../N8nCallout';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

export default {
	title: 'Atoms/Menu',
	component: N8nMenu,
	argTypes: {},
};

const methods = {
	onSelect: action('select'),
};

const template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
	},
	template: `
		<div style="height: 90vh; width: 200px">
			<n8n-menu v-bind="args" @select="onSelect"></n8n-menu>
		</div>
	`,
	methods,
});

const templateWithHeaderAndFooter: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
		N8nIcon,
		N8nText,
	},
	template: `
		<div style="height: 90vh; width: 200px">
			<n8n-menu v-bind="args" @select="onSelect">
				<template #header>
					<a href="#" class="p-m hideme" style="display: block;">
						<n8n-icon icon="long-arrow-alt-left"/>&nbsp;&nbsp;Back to home
					</a>
				</template>
				<template #footer>
					<div class="p-m hideme">
						<n8n-icon icon="circle-user-round" size="xlarge"/>&nbsp;&nbsp;
						<n8n-text>John Smithson</n8n-text>
					</div>
				</template>
			</n8n-menu>
		</div>
	`,
	methods,
});

const templateWithAllSlots: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
		N8nIcon,
		N8nText,
	},
	template: `
		<div style="height: 90vh; width: 200px">
			<n8n-menu v-bind="args" @select="onSelect">
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
						<n8n-icon icon="circle-user-round" size="xlarge"/>&nbsp;&nbsp;
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
		icon: 'network',
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
		icon: 'x',
		label: 'Not Available',
		available: false,
		position: 'top',
	},
	{
		id: 'website',
		icon: 'globe',
		label: 'Website',
		link: {
			href: 'https://www.n8n.io',
			target: '_blank',
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
				icon: 'x',
				label: 'Not Available',
				available: false,
				position: 'top',
			},
			{
				id: 'quickstart',
				icon: 'video',
				label: 'Quickstart',
				link: {
					href: 'https://www.youtube.com/watch?v=RpjQTGKm-ok',
					target: '_blank',
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

export const withCustomComponent = templateWithHeaderAndFooter.bind({});
withCustomComponent.args = {
	items: [
		...menuItems,
		{
			id: 'custom',
			icon: 'bell',
			label: "What's New",
			position: 'bottom',
			children: [
				{
					id: 'custom-callout',
					component: N8nCallout,
					available: true,
					props: {
						theme: 'warning',
						icon: 'bell',
					},
				},
			],
		},
	],
};

export const withNotification = templateWithHeaderAndFooter.bind({});
withNotification.args = {
	items: [
		...menuItems,
		{
			id: 'notification',
			icon: 'bell',
			label: 'Notification',
			position: 'top',
			notification: true,
		},
	],
};

export const withSmallMenu = templateWithHeaderAndFooter.bind({});
withSmallMenu.args = {
	items: [
		...menuItems,
		{
			id: 'notification',
			icon: {
				type: 'icon',
				value: 'bell',
				color: 'primary',
			},
			label: 'Small items',
			position: 'top',
			children: [
				{ icon: 'info', label: 'About n8n', id: 'about', size: 'small' },
				{ icon: 'book', label: 'Documentation', id: 'docs', size: 'small' },
				{
					icon: 'bell',
					label: 'Notification',
					id: 'notification',
					notification: true,
					size: 'small',
				},
			],
		},
	],
};
