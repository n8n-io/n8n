<script setup lang="ts">
// Prototype, direction B of the review preview:
// 1. One list of issues, as bullets in the verdict callout. Each issue points at its field.
// 2. The changed files, as the fields of the skill modal. A field marks the text of an issue
//    and shows an issue icon in the gutter left of its label. There are no messages in the fields.
// 3. Notes for information, with no colour.
import { computed, nextTick, ref, watch } from 'vue';
import { N8nText } from '@n8n/design-system';

import { SKILL_FILE } from '@/features/agents/components/skillVersions/skillVersionDiff';

import SkillFieldReviewFile from './SkillFieldReviewFile.vue';
import SkillReviewIssues, { type ReviewIssueRow } from './SkillReviewIssues.vue';
import type { FieldReviewIssue, SkillFieldReviewModel } from './skillFieldReview';

const props = defineProps<{ model: SkillFieldReviewModel }>();

const root = ref<HTMLElement | null>(null);
const openFiles = ref(new Set<string>());

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

type Revealable = { reveal: (fieldKey?: string) => void };

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

function hasFile(issue: FieldReviewIssue) {
	return !!issue.file && props.model.files.some((file) => file.path === issue.file);
}

function fieldLabel(issue: FieldReviewIssue) {
	const file = props.model.files.find((candidate) => candidate.path === issue.file);
	return file?.fields.find((field) => field.key === issue.field)?.label;
}

const issueRows = computed<ReviewIssueRow[]>(() =>
	props.model.issues.map((issue) => ({
		id: issue.id,
		severity: issue.severity,
		title: issue.title,
		detail: issue.detail,
		// A field of SKILL.md is known by its label. Another file is known by its path.
		location: (issue.file === SKILL_FILE ? fieldLabel(issue) : issue.file) ?? undefined,
		canJump: hasFile(issue),
	})),
);

const FLASH_CLASS = 'skill-review-flash';

/** The editor draws its marks a frame after it mounts, so a jump waits for them. */
async function findTarget(selector: string, tries = 10): Promise<HTMLElement | null> {
	for (let attempt = 0; attempt < tries; attempt++) {
		const element = root.value?.querySelector<HTMLElement>(selector);
		if (element) return element;
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	return null;
}

/** Opens the file and the field of the issue, scrolls to its text and outlines it a moment. */
async function onSelect(id: string) {
	const issue = props.model.issues.find((candidate) => candidate.id === id);
	if (!issue?.file || !hasFile(issue)) return;
	setOpen(issue.file, true);
	await nextTick();
	fileRefs[issue.file]?.reveal(issue.field);
	await nextTick();
	const section = `[data-review-file="${CSS.escape(issue.file)}"]`;
	const target =
		(issue.match && (await findTarget(`${section} [data-finding-id="${CSS.escape(issue.id)}"]`))) ||
		// The input of the field, not its label.
		(issue.field &&
			(await findTarget(
				`${section} [data-review-field="${CSS.escape(issue.field)}"] [data-review-input]`,
				1,
			))) ||
		(await findTarget(section, 1));
	if (!target) return;
	target.scrollIntoView({ block: 'center', behavior: 'smooth' });
	target.classList.add(FLASH_CLASS);
	setTimeout(() => target.classList.remove(FLASH_CLASS), 1600);
}
</script>

<template>
	<div ref="root" :class="$style.review" data-test-id="skill-field-review">
		<SkillReviewIssues
			v-if="model.issues.length > 0"
			:verdict="model.verdict"
			:issues="issueRows"
			layout="bullets"
			@select="onSelect"
		/>

		<div v-if="model.files.length > 0" :class="$style.files">
			<div v-for="file in model.files" :key="file.path" :data-review-file="file.path">
				<SkillFieldReviewFile
					:ref="(el) => setFileRef(file.path, el)"
					:file="file"
					:issues="issuesIn(file.path)"
					:mode="model.mode"
					:web-url="model.webUrl"
					:open="openFiles.has(file.path)"
					@update:open="setOpen(file.path, $event)"
				/>
			</div>
		</div>

		<ul v-if="model.notes.length > 0" :class="$style.notes" data-test-id="skill-field-review-notes">
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

<!-- The flash goes on marks inside the editor, which only take global classes. -->
<style lang="scss">
.skill-review-flash {
	outline: var(--focus--border-width, 2px) solid var(--color--primary);
	outline-offset: 2px;
	border-radius: var(--radius--sm, 2px);
}

/* A mark has square corners, so its outline has too. */
.skill-review-flash.skill-finding-mark {
	border-radius: 0;
}
</style>
