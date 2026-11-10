<script setup lang="ts">
// Prototype, direction B: a one-line field of the skill modal, read only. A change shows as
// the old line and the new line. An issue marks its text: point at the mark to see the issue
// name. There is no message under the field: the issue list holds it. Every mark is yellow,
// also for Blocked: red belongs to the removed lines of the diff.
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nInputLabel,
	N8nTooltip,
	changedWordRanges,
	diffMarkdownWords,
	splitByRanges,
} from '@n8n/design-system';

// The diff and mark classes are global styles that SkillDiffViewer owns.
import '../SkillDiffViewer.vue';
import type { FieldReviewIssue } from './skillFieldReview';

const props = defineProps<{
	fieldKey: string;
	label: string;
	before: string;
	after: string;
	issues: FieldReviewIssue[];
	/** n8n does not keep the field: it shows muted and struck through, with no diff. */
	dropped?: boolean;
}>();

const i18n = useI18n();

const changed = computed(() => props.before !== props.after);

const labelText = computed(() =>
	props.dropped
		? i18n.baseText('settings.context.skills.reviewB.field.dropped', {
				interpolate: { label: props.label },
			})
		: props.label,
);

const words = computed(() => changedWordRanges(diffMarkdownWords(props.before, props.after)));

/** Pieces of the new line: the text of an issue wins over a changed word. */
const afterPieces = computed(() => {
	const marks = props.issues.flatMap((issue) => {
		const at = issue.match ? props.after.indexOf(issue.match) : -1;
		return issue.match && at >= 0
			? [{ range: [at, at + issue.match.length] as [number, number], issue }]
			: [];
	});
	if (marks.length === 0) {
		return splitByRanges(props.after, changed.value ? words.value.to : []).map((piece) => ({
			...piece,
			issue: undefined,
		}));
	}
	// Marks in reading order, with no overlap, so the marked pieces come in the same order.
	marks.sort((a, b) => a.range[0] - b.range[0]);
	const kept = marks.filter(
		({ range }, index) => index === 0 || range[0] >= marks[index - 1].range[1],
	);
	let next = 0;
	return splitByRanges(
		props.after,
		kept.map(({ range }) => range),
	).map((piece) => ({ ...piece, issue: piece.changed ? kept[next++]?.issue : undefined }));
});

const beforePieces = computed(() => splitByRanges(props.before, words.value.from));

const issueTitles = computed(() => props.issues.map((issue) => issue.title).join(' · '));
</script>

<template>
	<N8nInputLabel :label="labelText" size="small" :data-review-field="fieldKey">
		<div
			v-if="dropped"
			:class="[$style.input, $style.dropped]"
			aria-disabled="true"
			data-review-input
			data-test-id="review-field-dropped"
		>
			<!-- The value has no mark, so the struck-through text holds the tooltip. As-child
				makes the text the trigger: a wrapper span would stretch to the full field width. -->
			<N8nTooltip v-if="issues.length > 0" as-child placement="top" :content="issueTitles">
				<s>{{ after || before }}</s>
			</N8nTooltip>
			<s v-else>{{ after || before }}</s>
		</div>
		<div
			v-else
			:class="[$style.input, changed && $style.changed, 'skill-diff-lines']"
			data-review-input
		>
			<div v-if="changed && before" class="skill-diff-removed">
				<span
					v-for="(piece, index) in beforePieces"
					:key="index"
					:class="piece.changed && 'skill-diff-word-removed'"
					>{{ piece.text }}</span
				>
			</div>
			<div v-if="after" :class="changed && 'skill-diff-added'">
				<template v-for="(piece, index) in afterPieces" :key="index">
					<N8nTooltip v-if="piece.issue" placement="top" :content="piece.issue.title">
						<span
							:class="['skill-finding-mark', 'skill-finding-mark--needs_review']"
							:data-finding-id="piece.issue.id"
							data-test-id="review-field-mark"
							>{{ piece.text }}</span
						>
					</N8nTooltip>
					<span v-else :class="piece.changed && 'skill-diff-word-added'">{{ piece.text }}</span>
				</template>
			</div>
		</div>
	</N8nInputLabel>
</template>

<style lang="scss" module>
/* The shape of a large input, as SkillLineDiffField draws it. */
.input {
	--skill-diff-inset: calc(var(--spacing--xs) + var(--border-width, 1px));

	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: calc(var(--spacing--4xs) * 2 + var(--spacing--2xs));
	box-sizing: border-box;
	min-height: var(--height--md);
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius--xs);
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	box-shadow: 0 0 0 1px var(--border-color);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

/* A field that n8n drops: the input keeps its background, the value is muted and struck through. */
.dropped {
	color: var(--text-color--subtler);

	s {
		align-self: flex-start;
		text-decoration-color: currentColor;
		cursor: default;
	}
}

/* With changed lines, the colour of a line reaches 4xs past its text. The rest of the space
   is the same as below a changed list item in the markdown editor. */
.changed {
	padding-block: calc(var(--spacing--4xs) + var(--spacing--3xs));
}
</style>
