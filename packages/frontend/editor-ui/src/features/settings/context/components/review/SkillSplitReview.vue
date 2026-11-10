<script setup lang="ts">
// Prototype, direction C of the review preview: two views, so the issues and the changes do not
// show at the same time.
// - Issues: the verdict, then each issue with the lines around it. Information notes come last.
// - Changes: the monospace diff of direction A, with the issues marked in the gutter only.
// A skill with issues opens on Issues. A skill with none opens on Changes.
import { computed, nextTick, ref, watch } from 'vue';
import { N8nButton, N8nCallout, N8nIcon, N8nSegmentControl, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import ReviewSnippet from './ReviewSnippet.vue';
import SkillChangeReview from './SkillChangeReview.vue';
import { SEVERITY_ICONS, type ReviewIssue, type SkillChangeReviewModel } from './skillChangeReview';

type View = 'issues' | 'changes';

const props = defineProps<{
	model: SkillChangeReviewModel;
	/** The view to open on. By default, Issues when the skill has issues, else Changes. */
	initialView?: View;
}>();

const i18n = useI18n();

function defaultView(): View {
	return props.initialView ?? (props.model.issues.length > 0 ? 'issues' : 'changes');
}

const view = ref<View>(defaultView());

// Another skill opens on its own default view.
watch(
	() => props.model,
	() => {
		view.value = defaultView();
	},
);

const viewOptions = computed(() => [
	{
		value: 'issues' as const,
		label: i18n.baseText('settings.context.skills.reviewC.view.issues', {
			interpolate: { count: props.model.issues.length },
		}),
	},
	{
		value: 'changes' as const,
		label: i18n.baseText('settings.context.skills.reviewC.view.changes'),
	},
]);

function onView(value: string | boolean) {
	if (value === 'issues' || value === 'changes') view.value = value;
}

const verdictText = computed(() => {
	const count = props.model.issues.length;
	return i18n.baseText(
		props.model.verdict === 'blocked'
			? 'settings.context.skills.reviewA.verdict.blocked'
			: 'settings.context.skills.reviewA.verdict.needsReview',
		{ interpolate: { count }, adjustToNumber: count },
	);
});

const verdictIcon = computed(
	() => SEVERITY_ICONS[props.model.verdict === 'blocked' ? 'blocked' : 'needs_review'].icon,
);

function textOf(issue: ReviewIssue): string | undefined {
	return props.model.files.find((file) => file.path === issue.file)?.after ?? undefined;
}

function canShow(issue: ReviewIssue): boolean {
	return !!issue.file && props.model.files.some((file) => file.path === issue.file);
}

function locationText(issue: ReviewIssue) {
	if (!issue.file) return '';
	return issue.line !== undefined ? `${issue.file}:${issue.line}` : issue.file;
}

type Selectable = { select: (id: string) => void };

const changes = ref<Selectable | null>(null);

function isSelectable(value: unknown): value is Selectable {
	return (
		typeof value === 'object' &&
		value !== null &&
		'select' in value &&
		typeof value.select === 'function'
	);
}

function setChanges(value: unknown) {
	changes.value = isSelectable(value) ? value : null;
}

/** Switches to Changes, then opens the file of the issue and scrolls to its line. */
async function showInChanges(issue: ReviewIssue) {
	view.value = 'changes';
	await nextTick();
	changes.value?.select(issue.id);
}
</script>

<template>
	<div :class="$style.review" data-test-id="skill-split-review">
		<div :class="$style.bar">
			<N8nSegmentControl
				:model-value="view"
				:options="viewOptions"
				size="small"
				data-test-id="skill-split-review-view"
				@update:model-value="onView"
			/>
		</div>

		<div
			v-show="view === 'issues'"
			:class="$style.issuesView"
			data-test-id="skill-split-review-issues"
		>
			<N8nCallout
				v-if="model.issues.length > 0"
				theme="warning"
				:icon="verdictIcon"
				slim
				icon-size="small"
			>
				{{ verdictText }}
			</N8nCallout>
			<div v-else :class="$style.noIssues">
				<N8nIcon icon="circle-check" color="success" size="small" />
				<N8nText size="small">
					{{ i18n.baseText('settings.context.skills.connect.preview.noIssues') }}
				</N8nText>
			</div>

			<ul v-if="model.issues.length > 0" :class="$style.issues">
				<li
					v-for="issue in model.issues"
					:key="issue.id"
					:class="$style.issue"
					data-test-id="skill-split-review-issue"
				>
					<div :class="$style.issueHeader">
						<N8nIcon
							:icon="SEVERITY_ICONS[issue.severity].icon"
							:color="SEVERITY_ICONS[issue.severity].color"
							size="small"
							:class="$style.icon"
						/>
						<N8nText size="small" bold :class="$style.title">{{ issue.title }}</N8nText>
						<N8nText v-if="issue.file" size="xsmall" color="text-light">
							{{ locationText(issue) }}
						</N8nText>
						<N8nButton
							v-if="canShow(issue)"
							variant="ghost"
							size="xsmall"
							:label="i18n.baseText('settings.context.skills.reviewC.showInChanges')"
							data-test-id="skill-split-review-show"
							@click="showInChanges(issue)"
						/>
					</div>
					<N8nText v-if="issue.detail" size="small" color="text-light" :class="$style.body">
						{{ issue.detail }}
					</N8nText>
					<ReviewSnippet
						v-if="issue.line !== undefined && textOf(issue)"
						:text="textOf(issue) ?? ''"
						:line="issue.line"
						:match="issue.match"
						:class="$style.body"
					/>
				</li>
			</ul>

			<ul
				v-if="model.notes.length > 0"
				:class="$style.notes"
				data-test-id="skill-split-review-notes"
			>
				<li v-for="note in model.notes" :key="note.id">
					<N8nText size="small" color="text-light">{{ note.text }}</N8nText>
				</li>
			</ul>
		</div>

		<SkillChangeReview
			v-show="view === 'changes'"
			:ref="setChanges"
			:model="model"
			hide-issues
			hide-notes
		/>
	</div>
</template>

<style lang="scss" module>
.review {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

/* The switch stays at the top of the pane while the content scrolls under it. */
.bar {
	position: sticky;
	top: calc(var(--spacing--sm) * -1);
	z-index: 1;
	display: flex;
	margin-top: calc(var(--spacing--sm) * -1);
	padding-block: var(--spacing--sm) var(--spacing--2xs);
	background-color: var(--background--surface);
}

.issuesView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.noIssues {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.issues {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.issue {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}

	&:first-child {
		padding-top: 0;
	}
}

.issueHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.icon {
	flex-shrink: 0;
}

.title {
	flex: 1;
	min-width: 0;
}

/* The detail and the lines line up with the title, after the icon. */
.body {
	margin-inline-start: calc(var(--spacing--sm) + var(--spacing--2xs));
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
