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
			/* stylelint-disable-next-line @n8n/css-var-naming */
			--fgColor-default: var(--color--text--shade-1);
			/* stylelint-disable-next-line @n8n/css-var-naming */
			--bgColor-default: var(--color--background--light-2);
			/* stylelint-disable-next-line @n8n/css-var-naming */
			--color-fg-subtle: var(--color--text--tint-1); // Muted text

			// deletions
			--diff--blob--deletion-num--color--background: var(--diff--color--deleted--light);
			--diff--blob--deletion-num--color--text: var(--color--text--tint-3);
			--diff--color--danger--emphasis: var(--diff--color--deleted);

			// insertions
			--diff--blob--addition-num--color--text: var(--color--text--tint-3);
			--diff--blob--addition-num--color--background: var(--diff--color--new--light);
			--diff--color--success--emphasis: var(--diff--color--new);

			--diff--blob--hunk-num--color--background: var(--color--background--shade-1);
			:global(.blob-code-hunk) {
				background-color: var(--diff--blob--hunk-num--color--background);
			}
		}
	}
}
</style>
