<script setup lang="ts">
// Prototype, direction A of the review preview:
// 1. One list of issues, as bullets in the verdict callout. Each issue points at its line.
// 2. The changed files. The diff marks lines in the gutter and has no messages of its own.
// 3. Notes for information, with no colour.
import { computed, nextTick, ref, watch } from 'vue';
import { N8nText } from '@n8n/design-system';

import SkillChangeReviewFile from './SkillChangeReviewFile.vue';
import SkillReviewIssues, { type ReviewIssueRow } from './SkillReviewIssues.vue';
import type { ReviewIssue, SkillChangeReviewModel } from './skillChangeReview';

const props = defineProps<{
	model: SkillChangeReviewModel;
	/** Leaves out the issue list, for a parent that shows the issues in a view of its own. */
	hideIssues?: boolean;
	/** Leaves out the notes, for a parent that shows them in a view of its own. */
	hideNotes?: boolean;
}>();

/** The files that are open. */
const openFiles = ref(new Set<string>());
const flash = ref<{ file: string; line: number } | null>(null);
type Revealable = { reveal: (line: number) => void };

/** The file components by path, so a jump can open the folded lines around its line. */
const fileRefs: Record<string, Revealable | null> = {};

function isRevealable(value: unknown): value is Revealable {
	return (
		typeof value === 'object' &&
		value !== null &&
		'reveal' in value &&
		typeof value.reveal === 'function'
	);
}

function setFileRef(path: string, value: unknown) {
	fileRefs[path] = isRevealable(value) ? value : null;
}
const root = ref<HTMLElement | null>(null);

watch(
	() => props.model,
	(model) => {
		// Files with an issue start open. With no issue, the change is all there is to read.
		openFiles.value = new Set(
			model.files
				.filter(
					(file) =>
						model.issues.length === 0 || model.issues.some((issue) => issue.file === file.path),
				)
				.map((file) => file.path),
		);
		flash.value = null;
	},
	{ immediate: true },
);

function setOpen(path: string, open: boolean) {
	const next = new Set(openFiles.value);
	if (open) next.add(path);
	else next.delete(path);
	openFiles.value = next;
}

function issuesIn(path: string) {
	return props.model.issues.filter((issue) => issue.file === path);
}

function hasFile(issue: ReviewIssue) {
	return !!issue.file && props.model.files.some((file) => file.path === issue.file);
}

let flashTimer: ReturnType<typeof setTimeout> | undefined;

/** Opens the file of the issue, scrolls to its line and outlines it for a moment. */
async function jumpTo(issue: ReviewIssue) {
	if (!issue.file || !hasFile(issue)) return;
	const file = issue.file;
	setOpen(file, true);
	if (issue.line !== undefined) fileRefs[file]?.reveal(issue.line);
	await nextTick();
	const section = root.value?.querySelector<HTMLElement>(
		`[data-review-file="${CSS.escape(file)}"]`,
	);
	const target =
		issue.line !== undefined
			? section?.querySelector<HTMLElement>(`[data-review-line="${issue.line}"]`)
			: section;
	target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	if (issue.line === undefined) return;
	flash.value = { file, line: issue.line };
	clearTimeout(flashTimer);
	flashTimer = setTimeout(() => (flash.value = null), 1600);
}

const issueRows = computed<ReviewIssueRow[]>(() =>
	props.model.issues.map((issue) => ({
		id: issue.id,
		severity: issue.severity,
		title: issue.title,
		detail: issue.detail,
		location: locationText(issue),
		canJump: hasFile(issue),
	})),
);

function onSelect(id: string) {
	const issue = props.model.issues.find((candidate) => candidate.id === id);
	if (issue) void jumpTo(issue);
}

/** A parent can jump to an issue by its id, such as from a view of its own. */
defineExpose({ select: onSelect });

function locationText(issue: ReviewIssue) {
	if (!issue.file) return '';
	return issue.line !== undefined ? `${issue.file}:${issue.line}` : issue.file;
}
</script>

<template>
	<div ref="root" :class="$style.review" data-test-id="skill-change-review">
		<SkillReviewIssues
			v-if="!hideIssues && model.issues.length > 0"
			:verdict="model.verdict"
			:issues="issueRows"
			layout="bullets"
			@select="onSelect"
		/>

		<div v-if="model.files.length > 0" :class="$style.files">
			<div v-for="file in model.files" :key="file.path" :data-review-file="file.path">
				<SkillChangeReviewFile
					:ref="(el) => setFileRef(file.path, el)"
					:file="file"
					:issues="issuesIn(file.path)"
					:mode="model.mode"
					:web-url="model.webUrl"
					:flash-line="flash?.file === file.path ? flash.line : null"
					:open="openFiles.has(file.path)"
					@update:open="setOpen(file.path, $event)"
				/>
			</div>
		</div>

		<ul
			v-if="!hideNotes && model.notes.length > 0"
			:class="$style.notes"
			data-test-id="skill-change-review-notes"
		>
			<li v-for="note in model.notes" :key="note.id">
				<N8nText size="small" color="text-light">{{ note.text }}</N8nText>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.review {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.files {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.notes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0 0 0 var(--spacing--sm);
	list-style: disc;
	color: var(--text-color--subtler);
}
</style>
