<script setup lang="ts">
// Prototype, direction B: one file of the review as the fields of the skill modal. Folded, it
// shows only its header. Open, it shows the changed fields and the fields with an issue, and a
// toggle in the header shows the unchanged fields too. The fields sit on the page, with no box.
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import ReviewLineField from './ReviewLineField.vue';
import ReviewMarkdownField from './ReviewMarkdownField.vue';
import type { FieldReviewFile, FieldReviewIssue } from './skillFieldReview';

const props = defineProps<{
	file: FieldReviewFile;
	issues: FieldReviewIssue[];
	mode: 'diff' | 'plain';
	webUrl?: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();

const showAll = ref(false);

watch(
	() => props.file,
	() => {
		showAll.value = false;
	},
);

function issuesIn(key: string) {
	return props.issues.filter((issue) => issue.field === key);
}

/** A plain file shows every field. A diff shows what changed and what has an issue. */
function isShown(key: string, changed: boolean) {
	return props.mode === 'plain' || showAll.value || changed || issuesIn(key).length > 0;
}

const shownFields = computed(() =>
	props.file.fields.filter((field) => isShown(field.key, field.changed)),
);

/** The fields that the toggle shows and hides: those with no change and no issue. */
const unchangedCount = computed(
	() =>
		props.file.fields.filter((field) => !field.changed && issuesIn(field.key).length === 0).length,
);

/** Opens the file and the field, so a jump from the issue list can reach it. */
function reveal(fieldKey?: string) {
	open.value = true;
	if (fieldKey && !shownFields.value.some((field) => field.key === fieldKey)) showAll.value = true;
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
	<section :class="$style.file" data-test-id="skill-field-review-file">
		<div :class="$style.header">
			<button
				type="button"
				:class="$style.toggle"
				:aria-expanded="open"
				data-test-id="skill-field-review-file-toggle"
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
				v-if="open && mode === 'diff' && unchangedCount > 0"
				type="button"
				:class="$style.toggleUnchanged"
				:aria-expanded="showAll"
				data-test-id="skill-field-review-unchanged"
				@click="showAll = !showAll"
			>
				<N8nIcon icon="chevrons-up-down" size="xsmall" />
				{{
					showAll
						? i18n.baseText('settings.context.skills.reviewB.hideUnchangedFields')
						: i18n.baseText('settings.context.skills.reviewB.unchangedFields', {
								interpolate: { count: unchangedCount },
								adjustToNumber: unchangedCount,
							})
				}}
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

		<div v-if="open" :class="$style.body">
			<template v-for="field in shownFields" :key="field.key">
				<ReviewLineField
					v-if="field.kind === 'line'"
					:dropped="field.dropped"
					:field-key="field.key"
					:label="field.label"
					:before="field.before"
					:after="field.after"
					:issues="issuesIn(field.key)"
				/>
				<ReviewMarkdownField
					v-else
					:field-key="field.key"
					:label="field.label"
					:before="field.before"
					:after="field.after"
					:issues="issuesIn(field.key)"
				/>
			</template>
		</div>
	</section>
</template>

<style lang="scss" module>
.file {
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	/* The chevron lines up with the left edge of the issue callout. */
	padding: var(--spacing--4xs) var(--spacing--3xs) var(--spacing--4xs) 0;
}

.toggle {
	display: flex;
	flex: 1;
	align-items: center;
	/* The path lines up with the field labels. */
	gap: var(--spacing--4xs);
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
}

/* No box: only a gutter on the left, for the + and − signs. The signs line up with the left
   edge of the issue callout. */
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0 var(--spacing--xs) var(--spacing--sm);
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
</style>
