<script setup lang="ts">
// Prototype, direction A: one file of the review. Folded, it shows only its header. Open, it
// shows the changed lines with a little context. A toggle in the header shows the unchanged
// lines too. An issue marks its line in the gutter.
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	SEVERITY_ICONS,
	gapOf,
	rowsOf,
	type ReviewFile,
	type ReviewIssue,
	type ReviewIssueSeverity,
} from './skillChangeReview';

const props = defineProps<{
	file: ReviewFile;
	/** The issues in this file. */
	issues: ReviewIssue[];
	mode: 'diff' | 'plain';
	webUrl?: string;
	/** The line that flashes after a jump from the issue list. */
	flashLine?: number | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();

/** The folded runs of unchanged lines that the user opened, by the index of their first line. */
const openGaps = ref(new Set<number>());
/** The header toggle opens every folded run at once. */
const showAll = ref(false);

watch(
	() => props.file,
	() => {
		openGaps.value = new Set();
		showAll.value = false;
	},
);

const issuesByLine = computed(() => {
	const map = new Map<number, ReviewIssue[]>();
	for (const issue of props.issues) {
		if (issue.line === undefined) continue;
		map.set(issue.line, [...(map.get(issue.line) ?? []), issue]);
	}
	return map;
});

/** The rows with every run folded, so the toggle knows the runs and how many lines they hold. */
const foldedRows = computed(() =>
	rowsOf(props.file, new Set(issuesByLine.value.keys()), new Set(), props.mode === 'plain'),
);

const gaps = computed(() => foldedRows.value.flatMap((row) => (row.kind === 'gap' ? [row] : [])));

const rows = computed(() =>
	rowsOf(
		props.file,
		new Set(issuesByLine.value.keys()),
		showAll.value ? new Set(gaps.value.map((gap) => gap.id)) : openGaps.value,
		// A plain file has no changes to fold around, so it shows every line.
		props.mode === 'plain',
	),
);

/** The unchanged lines that are still folded. */
const foldedCount = computed(() =>
	rows.value.reduce((sum, row) => sum + (row.kind === 'gap' ? row.count : 0), 0),
);

/** A folded file counts every unchanged line, as the toggle opens them all. */
const toggleLabel = computed(() => {
	if (open.value && foldedCount.value === 0) {
		return i18n.baseText('settings.context.skills.reviewA.hideUnchangedLines');
	}
	const count = open.value
		? foldedCount.value
		: gaps.value.reduce((sum, gap) => sum + gap.count, 0);
	return i18n.baseText('settings.context.skills.reviewA.unchangedLines', {
		interpolate: { count },
		adjustToNumber: count,
	});
});

/** The toggle also opens a folded file, so the lines it shows are in view. */
function toggleUnchanged() {
	if (!open.value || foldedCount.value > 0) {
		open.value = true;
		showAll.value = true;
		return;
	}
	showAll.value = false;
	openGaps.value = new Set();
}

/** Each row with its issues and the marked part of its text. */
const view = computed(() =>
	rows.value.map((row) => {
		if (row.kind === 'gap') return row;
		const issues = row.newLine === undefined ? [] : (issuesByLine.value.get(row.newLine) ?? []);
		return { ...row, issues, mark: issues.length > 0 ? marked(row.text, issues) : null };
	}),
);

function worst(issues: ReviewIssue[]): ReviewIssueSeverity {
	return issues.some((issue) => issue.severity === 'blocked') ? 'blocked' : 'needs_review';
}

/** The text of a flagged line, split around the first match of its issues. */
function marked(text: string, issues: ReviewIssue[]) {
	for (const issue of issues) {
		const start = issue.match ? text.indexOf(issue.match) : -1;
		if (issue.match && start !== -1) {
			return {
				before: text.slice(0, start),
				match: text.slice(start, start + issue.match.length),
				after: text.slice(start + issue.match.length),
				severity: issue.severity,
			};
		}
	}
	return null;
}

function openGap(id: number) {
	openGaps.value = new Set([...openGaps.value, id]);
}

/** Opens the file and the folded run that holds `line`, so the line is in the page. */
function reveal(line: number) {
	open.value = true;
	const gap = gapOf(rows.value, props.file, line);
	if (gap !== undefined) openGap(gap);
}

defineExpose({ reveal });

const fileUrl = computed(() => {
	if (!props.webUrl || props.file.status === 'removed') return undefined;
	return `${props.webUrl.replace(/\/$/, '').replace('/tree/', '/blob/')}/${props.file.path}`;
});

const STATUS_LABELS = {
	added: 'settings.context.skills.reviewA.file.added',
	removed: 'settings.context.skills.reviewA.file.removed',
} as const;
</script>

<template>
	<section :class="$style.file" data-test-id="skill-change-review-file">
		<div :class="$style.header">
			<button
				type="button"
				:class="$style.toggle"
				:aria-expanded="open"
				data-test-id="skill-change-review-file-toggle"
				@click="open = !open"
			>
				<N8nIcon :icon="open ? 'chevron-down' : 'chevron-right'" size="small" color="text-light" />
				<N8nText size="small" :class="$style.path">{{ file.path }}</N8nText>
				<N8nText
					v-if="mode === 'diff' && (file.status === 'added' || file.status === 'removed')"
					size="xsmall"
					color="text-light"
				>
					{{ i18n.baseText(STATUS_LABELS[file.status]) }}
				</N8nText>
			</button>
			<button
				v-if="mode === 'diff' && gaps.length > 0"
				type="button"
				:class="$style.toggleUnchanged"
				:aria-expanded="open && foldedCount === 0"
				data-test-id="skill-change-review-unchanged"
				@click="toggleUnchanged"
			>
				<N8nIcon icon="chevrons-up-down" size="xsmall" />
				{{ toggleLabel }}
			</button>
			<N8nIconButton
				v-if="fileUrl"
				icon="external-link"
				variant="ghost"
				size="xsmall"
				:href="fileUrl"
				target="_blank"
				:aria-label="i18n.baseText('settings.context.skills.synced.openInGithub')"
				:title="i18n.baseText('settings.context.skills.synced.openInGithub')"
			/>
		</div>

		<div v-if="open" :class="$style.code" data-test-id="skill-change-review-file-code">
			<template
				v-for="row in view"
				:key="row.kind === 'gap' ? `gap-${row.id}` : `${row.type}-${row.number}`"
			>
				<button
					v-if="row.kind === 'gap'"
					type="button"
					:class="$style.gap"
					data-test-id="skill-change-review-gap"
					@click="openGap(row.id)"
				>
					<N8nIcon icon="chevrons-up-down" size="xsmall" />
					{{
						i18n.baseText('settings.context.skills.reviewA.unchangedLines', {
							interpolate: { count: row.count },
							adjustToNumber: row.count,
						})
					}}
				</button>
				<div
					v-else
					:class="[
						$style.row,
						$style[row.type],
						row.newLine !== undefined && row.newLine === flashLine && $style.flash,
					]"
					:data-review-line="row.newLine"
				>
					<span :class="$style.issueGutter">
						<N8nTooltip v-if="row.issues.length > 0" placement="left">
							<template #content>
								<div v-for="issue in row.issues" :key="issue.id">{{ issue.title }}</div>
							</template>
							<N8nIcon
								:icon="SEVERITY_ICONS[worst(row.issues)].icon"
								:color="SEVERITY_ICONS[worst(row.issues)].color"
								size="small"
								data-test-id="skill-change-review-line-issue"
							/>
						</N8nTooltip>
					</span>
					<span :class="$style.number" aria-hidden="true">{{ row.number }}</span>
					<span :class="$style.sign" aria-hidden="true">{{
						row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ''
					}}</span>
					<span v-if="row.mark" :class="$style.text"
						>{{ row.mark.before
						}}<mark :class="[$style.mark, $style[`mark-${row.mark.severity}`]]">{{
							row.mark.match
						}}</mark
						>{{ row.mark.after }}</span
					>
					<span v-else-if="row.segments" :class="$style.text"
						><span
							v-for="(segment, index) in row.segments"
							:key="index"
							:class="segment.changed && $style.changedWord"
							>{{ segment.text }}</span
						></span
					>
					<span v-else :class="$style.text">{{ row.text }}</span>
				</div>
			</template>
		</div>
	</section>
</template>

<style lang="scss" module>
.file {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--3xs) var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--background--subtle);
}

.toggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--4xs) 0;
	border: 0;
	background: transparent;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

.path {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: var(--font-family--monospace);
}

.toggleUnchanged {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--3xs);
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

.code {
	display: flex;
	flex-direction: column;
	padding-block: var(--spacing--4xs);
	border-top: var(--border);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.row {
	display: grid;
	grid-template-columns: var(--spacing--lg) var(--spacing--xl) var(--spacing--sm) 1fr;
	align-items: start;
	transition: box-shadow 0.3s ease;
}

.issueGutter {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--5xs);
}

.number {
	padding-inline-end: var(--spacing--2xs);
	color: var(--text-color--subtler);
	text-align: right;
	user-select: none;
}

.sign {
	color: var(--text-color--subtler);
	user-select: none;
}

.text {
	min-width: 0;
	padding-inline-end: var(--spacing--xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.added {
	background-color: var(--diff--color--new--faint);

	.sign {
		color: var(--diff--color--new);
	}
}

.removed {
	background-color: var(--diff--color--deleted--faint);

	.sign {
		color: var(--diff--color--deleted);
	}
}

.added .changedWord {
	background-color: var(--diff--color--new--light);
}

.removed .changedWord {
	background-color: var(--diff--color--deleted--light);
}

.mark {
	padding: 0 var(--spacing--5xs);
	font-style: normal;
	color: inherit;
	border-radius: var(--radius--sm, 2px);
}

.mark-needs_review {
	background-color: var(--callout--border-color--warning);
}

/* Yellow too: red belongs to the removed lines of the diff. */
.mark-blocked {
	background-color: var(--callout--border-color--warning);
}

/* A jump from the issue list outlines the line for a moment. */
.flash {
	box-shadow: inset 0 0 0 1px var(--color--primary);
}

.gap {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--lg);
	border: 0;
	background-color: var(--background--subtle);
	color: var(--text-color--subtler);
	font: inherit;
	font-family: var(--font-family--sans, inherit);
	text-align: left;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: -2px;
	}
}
</style>
