<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';
import { CodeDiff } from 'v-code-diff';

const uiStore = useUIStore();

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
		theme?: 'light' | 'dark';
	}>(),
	{
		outputFormat: 'line-by-line',
		language: 'json',
		hideHeader: true,
		diffStyle: 'word',
		theme: undefined,
	},
);
</script>

<template>
	<CodeDiff v-bind="props" :class="$style.codeDiff" :theme="props.theme || uiStore.appliedTheme" />
</template>

<style lang="scss" module>
/* Diff colors are now centralized in @n8n/design-system tokens */

.codeDiff {
	&:global(.code-diff-view) {
		height: 100%;
		margin: 0;
		border: none;
		border-radius: 0;

		:global(.blob-num) {
			display: none;
		}

		&:global([theme='dark']) {
			--fgColor-default: var(--color-text-dark);
			--bgColor-default: var(--color-background-light);
			--color-fg-subtle: var(--color-text-light); // Muted text

			// deletions
			--color-diff-blob-deletion-num-bg: var(--diff-del-light);
			--color-diff-blob-deletion-num-text: var(--color-text-xlight);
			--color-danger-emphasis: var(--diff-del);

			// insertions
			--color-diff-blob-addition-num-text: var(--color-text-xlight);
			--color-diff-blob-addition-num-bg: var(--diff-new-light);
			--color-success-emphasis: var(--diff-new);

			--color-diff-blob-hunk-num-bg: var(--color-background-medium);
			:global(.blob-code-hunk) {
				background-color: var(--color-diff-blob-hunk-num-bg);
			}
		}
	}
}
</style>
