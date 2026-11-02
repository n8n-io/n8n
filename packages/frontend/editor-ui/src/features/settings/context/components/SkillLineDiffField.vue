<script setup lang="ts">
// A one-line field (name, description, file name) in the shape of an input. When two versions
// are compared, it marks a change the same way as the markdown editors: the old line in red,
// the new line in green, each with its bar and its − or + sign. A check finding marks its text
// the same way, in the colour of its severity, with its message under the line.
import { computed } from 'vue';
import {
	N8nCallout,
	N8nInputLabel,
	changedWordRanges,
	diffMarkdownWords,
	splitByRanges,
	type MarkdownFinding,
} from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		label: string;
		/** The older text. Empty when the field is new. */
		from: string;
		/** The newer text. Empty when the field is gone. */
		to: string;
		findings?: MarkdownFinding[];
		testId?: string;
	}>(),
	{ findings: () => [] },
);

const SEVERITY_ORDER = { blocked: 0, needs_review: 1, info: 2 } as const;

const CALLOUTS = {
	blocked: { theme: 'danger', icon: 'circle-x' },
	needs_review: { theme: 'warning', icon: 'triangle-alert' },
	info: { theme: 'info', icon: 'circle-alert' },
} as const;

const changed = computed(() => props.from !== props.to);

/** Each side split into plain and changed words, so the exact change is highlighted. */
const pieces = computed(() => {
	const ranges = changedWordRanges(diffMarkdownWords(props.from, props.to));
	return { from: splitByRanges(props.from, ranges.from), to: splitByRanges(props.to, ranges.to) };
});

/** The most severe finding sets the colour of the line. */
const severity = computed(
	() =>
		[...props.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])[0]
			?.severity,
);

/** The text with the text of each finding marked. */
const marked = computed(() => {
	const ranges: Array<[number, number]> = [];
	for (const { match } of props.findings) {
		const at = match ? props.to.indexOf(match) : -1;
		if (at >= 0) ranges.push([at, at + match.length]);
	}
	ranges.sort(([a], [b]) => a - b);
	const merged = ranges.filter(([start], index) => index === 0 || start >= ranges[index - 1][1]);
	return splitByRanges(props.to, merged);
});
</script>

<template>
	<N8nInputLabel :label="props.label" size="small">
		<div
			:class="[$style.diffInput, changed && $style.diffInputChanged, 'skill-diff-lines']"
			:data-test-id="props.testId"
		>
			<template v-if="changed">
				<!-- One line each, so pre-wrap shows no stray space around the text. -->
				<div v-if="props.from" class="skill-diff-removed">
					<span
						v-for="(piece, index) in pieces.from"
						:key="index"
						:class="piece.changed && 'skill-diff-word-removed'"
						>{{ piece.text }}</span
					>
				</div>
				<div v-if="props.to" class="skill-diff-added">
					<span
						v-for="(piece, index) in pieces.to"
						:key="index"
						:class="piece.changed && 'skill-diff-word-added'"
						>{{ piece.text }}</span
					>
				</div>
			</template>
			<div v-else-if="severity">
				<span
					v-for="(piece, index) in marked"
					:key="index"
					:class="piece.changed && ['skill-finding-mark', `skill-finding-mark--${severity}`]"
					>{{ piece.text }}</span
				>
			</div>
			<template v-else>{{ props.to }}</template>
			<div
				v-for="(finding, index) in props.findings"
				:key="index"
				:class="[$style.note, 'skill-finding-note']"
			>
				<N8nCallout
					:theme="CALLOUTS[finding.severity].theme"
					:icon="CALLOUTS[finding.severity].icon"
					icon-size="small"
					slim
				>
					{{ finding.message }}
				</N8nCallout>
			</div>
		</div>
	</N8nInputLabel>
</template>

<style lang="scss" module>
/*
 * The shape of a large input. Changed lines look as they do in the markdown editors: the
 * colour reaches the side borders and only a little above and below the text, so the input
 * border still shows above and below, and two changed lines keep a gap between them.
 */
.diffInput {
	--skill-diff-inset: calc(var(--spacing--xs) + var(--border-width, 1px));
	--diff-input-padding-block: var(--spacing--3xs);
	--diff-input-gap: calc(var(--spacing--4xs) * 2 + var(--spacing--2xs));

	display: flex;
	flex-direction: column;
	gap: var(--diff-input-gap);
	box-sizing: border-box;
	min-height: var(--height--lg);
	padding: var(--diff-input-padding-block) var(--spacing--xs);
	border-radius: var(--radius--xs);
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	box-shadow: 0 0 0 1px var(--border-color);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

/* With marked lines, the same inner space as the markdown editor. */
.diffInputChanged {
	--diff-input-padding-block: calc(var(--spacing--xs) + var(--border-width, 1px) * 2);
}

/* A callout fills the box from side to side, right under the text, and meets the bottom edge.
   Doubled, so it wins over the global note rule, whatever order the styles load in. */
.note.note {
	margin: calc(var(--spacing--4xs) - var(--diff-input-gap)) calc(var(--spacing--xs) * -1) 0;

	&:last-child {
		margin-bottom: calc(var(--diff-input-padding-block) * -1);
	}
}
</style>
