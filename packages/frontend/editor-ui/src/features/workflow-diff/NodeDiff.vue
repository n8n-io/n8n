<script setup lang="ts">
import { CodeDiff } from 'v-code-diff';
withDefaults(
	defineProps<{
		oldString: string;
		newString: string;
		outputFormat?: 'side-by-side' | 'line-by-line';
		language?: string;
		hideStat?: boolean;
		hideHeader?: boolean;
	}>(),
	{
		outputFormat: 'line-by-line',
		language: 'json',
		hideHeader: true,
	},
);
</script>

<template>
	<CodeDiff
		:old-string
		:new-string
		:output-format
		:language
		:hide-stat
		:hide-header
		class="code-diff"
	/>
</template>

<style scoped>
.code-diff {
	height: 100%;
	margin: 0;
	border: none;
	border-radius: 0;
}
</style>
