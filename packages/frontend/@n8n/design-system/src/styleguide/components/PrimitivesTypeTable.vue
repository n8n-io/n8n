<script setup lang="ts">
import Sizes from '../Sizes.vue';
import VariableTable from '../VariableTable.vue';

const fontSizeVariables = [
	'--font-size--4xs',
	'--font-size--3xs',
	'--font-size--2xs',
	'--font-size--xs',
	'--font-size--sm',
	'--font-size--md',
	'--font-size--lg',
	'--font-size--xl',
	'--font-size--2xl',
];

const lineHeightVariables = [
	'--line-height--xs',
	'--line-height--sm',
	'--line-height--md',
	'--line-height--lg',
	'--line-height--xl',
];

const fontWeightVariables = [
	'--font-weight--regular',
	'--font-weight--medium',
	'--font-weight--bold',
];

const fontFamilyVariables = ['--font-family', '--font-family--monospace'];
</script>

<template>
	<div>
		<Sizes :variables="fontSizeVariables" attr="font-size" />
		<VariableTable :variables="lineHeightVariables" />
		<VariableTable :variables="fontWeightVariables" attr="font-weight" />
		<VariableTable :variables="fontFamilyVariables" attr="font-family" />
	</div>
</template>
