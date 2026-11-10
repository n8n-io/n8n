<script setup lang="ts">
// Prototype: a multi-line text field of the node diff, such as a prompt or a system message.
// It has the shape of a text area. A change shows line by line: the old line in red, the new
// line in green, with the changed words marked. Long runs of unchanged lines fold.
import { computed, ref, watch } from 'vue';
import { N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	diffLines,
	type DiffLine,
} from '@/features/agents/components/skillVersions/skillVersionDiff';
// The diff classes are global styles that SkillDiffViewer owns.
import '@/features/settings/context/components/SkillDiffViewer.vue';

const props = defineProps<{
	fieldKey: string;
	label: string;
	before: string;
	after: string;
	/** The value is an expression: monospace, as the expression input of the node. */
	expression?: boolean;
}>();

/** Unchanged lines that stay in view on each side of a change. */
const CONTEXT = 1;

/** A shorter run of unchanged lines stays open: a fold row would save no space. */
const MIN_FOLD = 3;

const i18n = useI18n();

const expanded = ref(false);
watch(
	() => [props.before, props.after],
	() => {
		expanded.value = false;
	},
);

const changed = computed(() => props.before !== props.after);

type Row = { kind: 'line'; line: DiffLine } | { kind: 'fold'; count: number };

/** The lines, with each long run of unchanged lines folded into one row. */
const rows = computed<Row[]>(() => {
	const lines = changed.value
		? diffLines(props.before, props.after)
		: props.after.split('\n').map((text): DiffLine => ({ type: 'equal', text }));
	if (expanded.value || !changed.value) return lines.map((line) => ({ kind: 'line', line }));

	const keep = lines.map((_, index) =>
		lines
			.slice(Math.max(0, index - CONTEXT), index + CONTEXT + 1)
			.some((line) => line.type !== 'equal'),
	);
	const out: Row[] = [];
	let run: DiffLine[] = [];
	const flush = () => {
		if (run.length >= MIN_FOLD) out.push({ kind: 'fold', count: run.length });
		else out.push(...run.map((line): Row => ({ kind: 'line', line })));
		run = [];
	};
	lines.forEach((line, index) => {
		if (!keep[index]) {
			run.push(line);
			return;
		}
		flush();
		out.push({ kind: 'line', line });
	});
	flush();
	return out;
});

const LINE_CLASS = { added: 'skill-diff-added', removed: 'skill-diff-removed' } as const;
const WORD_CLASS = { added: 'skill-diff-word-added', removed: 'skill-diff-word-removed' } as const;

/** A line with no counterpart is changed as a whole: its colour says so, with no word marks. */
function wordClass(line: DiffLine, changedWord: boolean) {
	if (line.type === 'equal' || !changedWord) return undefined;
	const whole = line.segments.every((segment) => segment.changed || segment.text.trim() === '');
	return whole ? undefined : WORD_CLASS[line.type];
}
</script>

<template>
	<N8nInputLabel
		:label="label"
		:bold="false"
		size="small"
		color="text-dark"
		:data-review-field="fieldKey"
	>
		<div
			:class="[
				$style.input,
				changed && $style.changed,
				expression && $style.expression,
				'skill-diff-lines',
			]"
		>
			<template v-for="(row, index) in rows" :key="index">
				<button
					v-if="row.kind === 'fold'"
					type="button"
					:class="$style.fold"
					@click="expanded = true"
				>
					{{
						i18n.baseText('workflowDiff.fields.unchangedLines', {
							interpolate: { count: row.count },
							adjustToNumber: row.count,
						})
					}}
				</button>
				<!-- An empty line keeps its height. No spaces around the text: the field keeps them. -->
				<div v-else-if="row.line.type === 'equal'" :class="$style.line">{{ row.line.text }}</div>
				<div v-else :class="[$style.line, LINE_CLASS[row.line.type]]">
					<span
						v-for="(segment, segmentIndex) in row.line.segments"
						:key="segmentIndex"
						:class="wordClass(row.line, segment.changed)"
						>{{ segment.text }}</span
					>
				</div>
			</template>
		</div>
	</N8nInputLabel>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/input' as input-mixin;

/* The shape of the text area of a parameter input: the same size and theme variables. */
.input {
	@include input-mixin.size-variables('medium');
	@include input-mixin.theme-variables;

	--skill-diff-inset: var(--input--padding);

	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	min-height: var(--input--height);
	padding: var(--spacing--3xs) var(--input--padding);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: inset var(--input--border--shadow);
	color: var(--input--color--text);
	font-size: var(--input--font-size);
	line-height: var(--line-height--md);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.changed {
	padding-block: var(--spacing--2xs);
}

/* An expression has the monospace text of the expression input. */
.expression {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.line {
	min-height: 1lh;
}

/* A folded run of unchanged lines: one muted row that opens all lines. */
.fold {
	align-self: flex-start;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color--subtler);
	font: inherit;
	font-size: var(--font-size--2xs);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}
</style>
