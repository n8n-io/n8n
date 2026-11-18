<script setup lang="ts">
import {
	toResourcePath,
	type PageBacklinks,
	type PageSummary,
	type PageWorkflowPlacement,
} from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import ResourceChip from '../resources/ResourceChip.vue';

/**
 * Lists what links to a page: the workflows that show it on their canvas, and the pages that
 * mention it. Renders nothing when nothing links to the page.
 */
const props = defineProps<{
	backlinks: PageBacklinks;
}>();

type BacklinkChip = { key: string; href: string; label: string };

const i18n = useI18n();

/** A workflow that shows the page in several sticky notes gives one chip. */
function toWorkflowChips(placements: PageWorkflowPlacement[]): BacklinkChip[] {
	const chipsByWorkflowId = new Map(
		placements.map(({ workflowId, workflowName }) => [
			workflowId,
			{
				key: workflowId,
				href: toResourcePath({ resourceType: 'workflow', resourceId: workflowId }),
				label: workflowName,
			},
		]),
	);
	return [...chipsByWorkflowId.values()];
}

function toPageChip({ id, title }: PageSummary): BacklinkChip {
	return {
		key: id,
		href: toResourcePath({ resourceType: 'page', resourceId: id }),
		label: title,
	};
}

const workflowChips = computed(() => toWorkflowChips(props.backlinks.workflows));
const pageChips = computed(() => props.backlinks.pages.map(toPageChip));
const hasBacklinks = computed(() => workflowChips.value.length + pageChips.value.length > 0);
</script>

<template>
	<section
		v-if="hasBacklinks"
		:class="$style.backlinks"
		:aria-label="i18n.baseText('page.backlinks.title')"
		data-test-id="page-backlinks"
	>
		<div :class="$style.heading">{{ i18n.baseText('page.backlinks.title') }}</div>
		<div v-if="workflowChips.length > 0" :class="$style.group">
			<div :class="$style.label">
				<N8nIcon icon="sticky-note" size="xsmall" />
				{{ i18n.baseText('page.backlinks.onCanvas') }}
			</div>
			<ul :class="$style.chips">
				<li v-for="chip in workflowChips" :key="chip.key" data-test-id="page-backlinks-workflow">
					<ResourceChip :href="chip.href" :label="chip.label" />
				</li>
			</ul>
		</div>
		<div v-if="pageChips.length > 0" :class="$style.group">
			<div :class="$style.label">
				<N8nIcon icon="at-sign" size="xsmall" />
				{{ i18n.baseText('page.backlinks.mentionedIn') }}
			</div>
			<ul :class="$style.chips">
				<li v-for="chip in pageChips" :key="chip.key" data-test-id="page-backlinks-page">
					<ResourceChip :href="chip.href" :label="chip.label" />
				</li>
			</ul>
		</div>
	</section>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.backlinks {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--xs);
	background-color: var(--background--subtle);
	font-size: var(--font-size--sm);

	@include motion.fade-in;
}

.heading {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.group {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
}

.label {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	// Keeps the chips of both groups in one column.
	width: calc(var(--spacing--3xl) + var(--spacing--2xl));
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}

.chips {
	display: flex;
	flex: 1;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	min-width: 0;
	margin: 0;
	padding: 0;
	list-style: none;

	> li {
		display: inline-flex;
		max-width: 100%;
		min-width: 0;
	}
}
</style>
