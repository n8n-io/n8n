<script setup lang="ts">
import VariableTable from '../VariableTable.vue';

const shadowColorVariables = ['--shadow-color'];

const shadowScaleVariables = [
	'--shadow--outline',
	'--shadow--2xs',
	'--shadow--xs',
	'--shadow--sm',
	'--shadow--md',
	'--shadow--xl',
];
</script>

<template>
	<div>
		<VariableTable :variables="shadowColorVariables" />
		<VariableTable :variables="shadowScaleVariables" attr="box-shadow" />
	</div>
</template>
