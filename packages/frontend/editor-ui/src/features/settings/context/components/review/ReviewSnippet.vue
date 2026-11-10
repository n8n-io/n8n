<script setup lang="ts">
// Prototype, direction C: the lines around an issue, in the monospace style of the diff, with
// the text of the issue marked. It shows the new version of the file.
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** The full text of the file. */
		text: string;
		/** The line of the issue, from 1. */
		line: number;
		match?: string;
		/** Lines before and after the line of the issue. */
		context?: number;
	}>(),
	{ match: undefined, context: 2 },
);

const rows = computed(() => {
	const lines = props.text.split('\n');
	const from = Math.max(1, props.line - props.context);
	const to = Math.min(lines.length, props.line + props.context);
	return Array.from({ length: to - from + 1 }, (_, index) => {
		const number = from + index;
		const text = lines[number - 1] ?? '';
		const at = number === props.line && props.match ? text.indexOf(props.match) : -1;
		return {
			number,
			isIssue: number === props.line,
			before: at >= 0 ? text.slice(0, at) : text,
			match: at >= 0 ? text.slice(at, at + (props.match?.length ?? 0)) : '',
			after: at >= 0 ? text.slice(at + (props.match?.length ?? 0)) : '',
		};
	});
});
</script>

<template>
	<pre :class="$style.snippet" data-test-id="review-snippet"><code><span
		v-for="row in rows"
		:key="row.number"
		:class="[$style.row, row.isIssue && $style.issueRow]"
	><span :class="$style.number" aria-hidden="true">{{ row.number }}</span><span :class="$style.text">{{ row.before }}<mark
		v-if="row.match"
		:class="$style.mark"
	>{{ row.match }}</mark>{{ row.after }}</span></span></code></pre>
</template>

<style lang="scss" module>
.snippet {
	margin: 0;
	padding: var(--spacing--4xs) 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	overflow: hidden;

	code {
		display: flex;
		flex-direction: column;
	}
}

.row {
	display: grid;
	grid-template-columns: var(--spacing--xl) 1fr;
	color: var(--text-color--subtle);
}

/* The line of the issue reads at full strength. The lines around it are only context. */
.issueRow {
	color: var(--text-color);
}

.number {
	padding-inline-end: var(--spacing--2xs);
	color: var(--text-color--subtler);
	text-align: right;
	user-select: none;
}

.text {
	min-width: 0;
	padding-inline-end: var(--spacing--xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

/* Yellow for every severity: red belongs to the removed lines of the diff. */
.mark {
	padding: 0 var(--spacing--5xs);
	border-radius: var(--radius--sm, 2px);
	background-color: var(--callout--border-color--warning);
	color: inherit;
	font-style: normal;
}
</style>
