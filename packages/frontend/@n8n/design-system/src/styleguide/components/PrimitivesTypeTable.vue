<script setup lang="ts">
import BasicTable from './BasicTable.vue';

const typeScaleColumns = [
	{ key: 'step', label: 'Step' },
	{ key: 'size', label: 'Size' },
	{ key: 'letterSpacing', label: 'Letter spacing' },
	{ key: 'lineHeight', label: 'Line height' },
];

const typeScaleRows = [
	{
		step: 1,
		size: 'var(--font-size--4xs)',
		letterSpacing: '0.0025em',
		lineHeight: 'var(--line-height--xs)',
	},
	{
		step: 2,
		size: 'var(--font-size--3xs)',
		letterSpacing: '0em',
		lineHeight: 'var(--line-height--sm)',
	},
	{
		step: 3,
		size: 'var(--font-size--2xs)',
		letterSpacing: '0em',
		lineHeight: 'var(--line-height--md)',
	},
	{
		step: 4,
		size: 'var(--font-size--xs)',
		letterSpacing: '-0.0025em',
		lineHeight: 'var(--line-height--md)',
	},
	{
		step: 5,
		size: 'var(--font-size--sm)',
		letterSpacing: '-0.005em',
		lineHeight: 'var(--line-height--lg)',
	},
	{
		step: 6,
		size: 'var(--font-size--md)',
		letterSpacing: '-0.00625em',
		lineHeight: 'var(--line-height--lg)',
	},
	{
		step: 7,
		size: 'var(--font-size--lg)',
		letterSpacing: '-0.0075em',
		lineHeight: 'var(--line-height--xl)',
	},
	{
		step: 8,
		size: 'var(--font-size--xl)',
		letterSpacing: '-0.01em',
		lineHeight: 'var(--line-height--xl)',
	},
	{
		step: 9,
		size: 'var(--font-size--2xl)',
		letterSpacing: '-0.025em',
		lineHeight: 'var(--line-height--xl)',
	},
];
</script>

<template>
	<div class="sb-unstyled">
		<p :class="$style.inter">Inter AaBbCc1234567890!@{}[]</p>
		<p :class="$style.mono">CommitMono AaBbCc1234567890!@{}[]</p>
	</div>
	<BasicTable :columns="typeScaleColumns" :rows="typeScaleRows" row-key="step" />
</template>

<style lang="scss" module>
.inter {
	font-size: 48px;
	font-family: var(--font-family);
}
.mono {
	font-size: 48px;
	font-family: var(--font-family--monospace);
}
</style>
