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

<style lang="scss">
/* Diff colors are now centralized in @n8n/design-system tokens */

.code-diff {
	height: 100%;
	margin: 0;
	border: none;
	border-radius: 0;

	// Dark theme support for v-code-diff
	[data-theme='dark'] & {
		// Main container and wrapper (primary background)
		background: var(--color-background-light) !important; // Dark background in dark theme
		color: var(--color-text-dark) !important; // In dark theme: light text

		// Target all possible wrapper elements
		> div,
		.v-code-diff,
		.v-code-diff-wrapper,
		.code-diff-wrapper,
		.diff-wrapper {
			background: var(--color-background-light) !important;
		}

		// Code diff view wrapper
		.code-diff-view {
			background: var(--color-background-light) !important; // Dark background
			color: var(--color-text-dark) !important;
		}

		// Main table wrapper
		.diff-table {
			background: var(--color-background-light) !important; // Dark background
			color: var(--color-text-dark) !important;
		}

		// Line numbers (slightly emphasized background)
		.blob-num {
			background: var(--color-background-darker) !important; // In dark theme: even lighter gray
			color: var(--color-text-light) !important; // Muted text
			border-color: var(--color-foreground-base) !important;
		}

		// Context lines (unchanged code - dark background for better contrast)
		.blob-num-context {
			background: var(--color-background-light) !important; // Dark background in dark theme
			color: var(--color-text-light) !important; // Muted text
		}

		.blob-code-context {
			background: var(--color-background-light) !important; // Dark background in dark theme
			color: var(--color-text-dark) !important; // Primary text
		}

		// Added lines (insertions)
		.blob-num-addition {
			background: var(--diff-new-light) !important;
			color: var(--color-text-xlight) !important;
			border-color: var(--diff-new) !important;
		}

		.blob-code-addition {
			background: var(--diff-new-faint) !important;
			color: var(--color-text-xlight) !important;
		}

		// Deleted lines
		.blob-num-deletion {
			background: var(--diff-del-light) !important;
			color: var(--color-text-xlight) !important;
			border-color: var(--diff-del) !important;
		}

		.blob-code-deletion {
			background: var(--diff-del-faint) !important;
			color: var(--color-text-xlight) !important;
		}

		// Hunk headers
		.blob-num-hunk,
		.blob-code-hunk {
			background: var(--color-background-medium) !important;
			color: var(--color-text-base) !important;
		}

		// Code markers and inner content
		.blob-code-inner {
			color: var(--color-text-dark) !important;
		}

		// Syntax highlighting overrides for dark theme
		.hljs-attr {
			color: #79c0ff !important;
		}

		.hljs-string {
			color: #a5d6ff !important;
		}

		.hljs-number {
			color: #79c0ff !important;
		}

		.hljs-punctuation {
			color: var(--color-text-light) !important;
		}

		.hljs-keyword,
		.hljs-literal {
			color: #ff7b72 !important;
		}

		// Character-level diff highlighting
		.x {
			background: rgba(255, 255, 255, 0.1) !important;
			color: inherit !important;
		}
	}
}
</style>
