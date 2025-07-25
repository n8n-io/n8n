<script setup lang="ts">
import { CodeDiff } from 'v-code-diff';
const props = withDefaults(
	defineProps<{
		oldString: string;
		newString: string;
		outputFormat?: 'side-by-side' | 'line-by-line';
		language?: string;
		hideStat?: boolean;
		hideHeader?: boolean;
		forceInlineComparison?: boolean;
		diffStyle?: 'word' | 'char';
	}>(),
	{
		outputFormat: 'line-by-line',
		language: 'json',
		hideHeader: true,
		diffStyle: 'word',
	},
);
</script>

<template>
	<CodeDiff v-bind="props" class="code-diff" />
</template>

<style scoped>
.code-diff {
	height: 100%;
	margin: 0;
	border: none;
	border-radius: 0;
}
</style>
