<script setup lang="ts">
import BasicTable from './BasicTable.vue';

const columns = [
	{ key: 'token', label: 'Token' },
	{ key: 'description', label: 'Description' },
];

const textRows = [
	{ token: '--text-color', description: 'Default body text and primary labels.' },
	{ token: '--text-color--subtle', description: 'Secondary text such as helper copy or metadata.' },
	{ token: '--text-color--subtler', description: 'Tertiary or low-emphasis text.' },
	{ token: '--text-color--inverse', description: 'Text shown on dark or inverse surfaces.' },
];

const backgroundRows = [
	{
		token: '--background--surface',
		description: 'Base surface for cards, panels, and page sections.',
	},
	{ token: '--background--hover', description: 'Hover state for neutral interactive surfaces.' },
	{
		token: '--background--active',
		description: 'Pressed/active state for neutral interactive surfaces.',
	},
	{
		token: '--background--success',
		description: 'Success banners, badges, or confirmation surfaces.',
	},
	{ token: '--background--warning', description: 'Warning callouts and cautionary surfaces.' },
	{
		token: '--background--danger',
		description: 'Danger/error surfaces behind destructive messaging.',
	},
	{ token: '--background--info', description: 'Informational surfaces and neutral notices.' },
];

const borderRows = [
	{ token: '--border-color', description: 'Default border for inputs, cards, and separators.' },
	{
		token: '--border-color--subtle',
		description: 'Low-contrast dividers and lightweight outlines.',
	},
	{
		token: '--border-color--strong',
		description: 'More prominent outlines for elevated contrast.',
	},
	{
		token: '--border-color--success',
		description: 'Borders for success states and confirmations.',
	},
	{ token: '--border-color--warning', description: 'Borders for warning states and cautions.' },
	{
		token: '--border-color--danger',
		description: 'Borders for error states and destructive actions.',
	},
	{ token: '--border-color--info', description: 'Borders for informational states.' },
];

const shadowRows = [
	{
		token: '--command-bar--shadow',
		description: 'Strong elevation shadow for popovers and overlays.',
	},
];
</script>

<template>
	<div :class="$style.container">
		<section :class="$style.group">
			<h3 :class="$style.heading">Text</h3>
			<BasicTable :columns="columns" :rows="textRows" row-key="token" />
		</section>
		<section :class="$style.group">
			<h3 :class="$style.heading">Background</h3>
			<BasicTable :columns="columns" :rows="backgroundRows" row-key="token" />
		</section>
		<section :class="$style.group">
			<h3 :class="$style.heading">Border</h3>
			<BasicTable :columns="columns" :rows="borderRows" row-key="token" />
		</section>
		<section :class="$style.group">
			<h3 :class="$style.heading">Shadow</h3>
			<BasicTable :columns="columns" :rows="shadowRows" row-key="token" />
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	display: grid;
	gap: var(--spacing--m);
	margin-top: var(--spacing--2xs);
}

.group {
	display: grid;
	gap: var(--spacing--2xs);
}

.heading {
	margin: 0;
	/* font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle); */
}
</style>
