<script lang="ts" setup>
import { N8nAiActivityStepResultSection } from '@n8n/design-system';
import { computed } from 'vue';
import { highlightCodeLine } from '../codeHighlight';
import {
	diffLines,
	languageFromPath,
	type DiffLine,
	type StrReplaceDiffView,
} from '../toolArgsDiff.utils';

const props = defineProps<{
	diff: StrReplaceDiffView;
}>();

const language = computed(() => languageFromPath(props.diff.path));

const hunkLines = computed(() =>
	props.diff.hunks.map((hunk) =>
		diffLines(hunk.oldString, hunk.newString).map((line) => ({
			...line,
			html: highlightCodeLine(line.text, language.value),
		})),
	),
);

function indicatorFor(type: DiffLine['type']): string {
	if (type === 'add') return '+';
	if (type === 'del') return '-';
	return ' ';
}
</script>

<template>
	<N8nAiActivityStepResultSection>
		<div :class="$style.root" data-test-id="tool-args-diff">
			<div v-if="props.diff.path" :class="$style.path">{{ props.diff.path }}</div>
			<div
				v-for="(lines, hunkIndex) in hunkLines"
				:key="hunkIndex"
				:class="$style.hunk"
				data-test-id="tool-args-diff-hunk"
			>
				<div
					v-for="(line, lineIndex) in lines"
					:key="lineIndex"
					:class="[$style.line, $style[line.type]]"
					data-test-id="tool-args-diff-line"
				>
					<span :class="$style.lineNumber">{{ line.newLineNumber ?? '' }}</span>
					<span :class="$style.indicator">{{ indicatorFor(line.type) }}</span>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<span :class="[$style.content, 'hljs']" v-html="line.html" />
				</div>
			</div>
		</div>
	</N8nAiActivityStepResultSection>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.path {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	word-break: break-all;
}

.hunk {
	max-height: 320px;
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.line {
	display: grid;
	grid-template-columns: 28px 16px minmax(0, 1fr);
	white-space: pre;
}

.lineNumber {
	text-align: right;
	padding-inline: var(--spacing--4xs);
	color: var(--color--text--tint-2);
	border-right: var(--border);
	user-select: none;
}

.indicator {
	text-align: center;
	opacity: 0.7;
	user-select: none;
}

.content {
	padding-inline-end: var(--spacing--2xs);
	overflow-x: auto;
	background: transparent;
}

.equal {
	background-color: var(--color--background);
	color: var(--color--text--tint-1);
}

.add {
	color: var(--diff--color--new);
	background-color: var(--diff--color--new--faint);
}

.del {
	color: var(--diff--color--deleted);
	background-color: var(--diff--color--deleted--faint);
}
</style>
