<script setup lang="ts">
import BasicTable from './BasicTable.vue';

const shadowScaleColumns = [
	{ key: 'step', label: 'Step' },
	{ key: 'value', label: 'Value' },
	{ key: 'description', label: 'Description' },
];

const shadowScaleRows = [
	{
		step: 'outline',
		value: 'var(--shadow--outline)',
		description: 'Used for focus outlines and similar effects.',
	},
	{
		step: '2xs',
		value: 'var(--shadow--2xs)',
		description: 'Used for very subtle shadows, such as small elements.',
	},
	{
		step: 'xs',
		value: 'var(--shadow--xs)',
		description: 'Used for slightly subtle shadows, such as on buttons or cards.',
	},
	{
		step: 'sm',
		value: 'var(--shadow--sm)',
		description: 'Used for standard shadows, such as on popovers or selects.',
	},
	{
		step: 'md',
		value: 'var(--shadow--md)',
		description: 'Used for more prominent shadows, such as floating elements.',
	},
	{ step: 'lg', value: 'var(--shadow--lg)', description: 'Used for larger shadows.' },
	{
		step: 'xl',
		value: 'var(--shadow--xl)',
		description: 'Used for elevated elements, such as dialogs.',
	},
];
</script>

<template>
	<BasicTable :columns="shadowScaleColumns" :rows="shadowScaleRows" row-key="step" />
</template>
