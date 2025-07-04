<script setup lang="ts">
import { CodeDiff } from 'v-code-diff';

withDefaults(
	defineProps<{
		oldString: string;
		newString: string;
		outputFormat?: 'side-by-side' | 'line-by-line';
		language?: string;
	}>(),
	{
		outputFormat: 'line-by-line',
		language: 'json',
	},
);
</script>

<template>
	<CodeDiff :old-string :new-string :output-format :language />
</template>
