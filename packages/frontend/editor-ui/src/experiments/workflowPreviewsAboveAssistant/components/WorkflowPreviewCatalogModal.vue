<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIconButton,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { WORKFLOW_PREVIEW_EXAMPLES } from '../examples';
import type { WorkflowPreviewExample, WorkflowPreviewStart } from '../types';
import WorkflowPreviewCard from './WorkflowPreviewCard.vue';
import WorkflowPreviewCatalogDetails from './WorkflowPreviewCatalogDetails.vue';

type CatalogFilter = 'all' | WorkflowPreviewStart;

const PAGE_SIZE = 3;
// Hidden for now; set to true to bring the category filters back.
const SHOW_FILTERS = false;

const FILTERS: Array<{ id: CatalogFilter; labelKey: BaseTextKey }> = [
	{ id: 'all', labelKey: 'experiments.workflowPreviewsAboveAssistant.catalog.filters.all' },
	{ id: 'event', labelKey: 'experiments.workflowPreviewsAboveAssistant.catalog.filters.event' },
	{
		id: 'schedule',
		labelKey: 'experiments.workflowPreviewsAboveAssistant.catalog.filters.schedule',
	},
];

const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	'use-example': [example: WorkflowPreviewExample, position: number];
}>();

const i18n = useI18n();
const activeFilter = ref<CatalogFilter>('all');
const page = ref(0);
// The example in the details panel. Null means the first card of the page.
const detailExampleId = ref<string | null>(null);

const filteredExamples = computed(() =>
	WORKFLOW_PREVIEW_EXAMPLES.filter(
		(example) => activeFilter.value === 'all' || example.start === activeFilter.value,
	),
);

const pageCount = computed(() => Math.ceil(filteredExamples.value.length / PAGE_SIZE));

const pagedExamples = computed(() =>
	filteredExamples.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE),
);

const detailExample = computed(
	() =>
		pagedExamples.value.find((example) => example.id === detailExampleId.value) ??
		pagedExamples.value[0],
);

const pageRange = computed(() =>
	i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.pagination.range', {
		interpolate: {
			start: page.value * PAGE_SIZE + 1,
			end: page.value * PAGE_SIZE + pagedExamples.value.length,
			total: filteredExamples.value.length,
		},
	}),
);

function setFilter(filter: CatalogFilter) {
	activeFilter.value = filter;
	setPage(0);
}

function setPage(next: number) {
	page.value = next;
	detailExampleId.value = null;
}

// The position is the 1-based index in the whole catalog, not in the filtered view.
function examplePosition(example: WorkflowPreviewExample) {
	return WORKFLOW_PREVIEW_EXAMPLES.findIndex((candidate) => candidate.id === example.id) + 1;
}

function useExample(example: WorkflowPreviewExample) {
	emit('use-example', example, examplePosition(example));
}

watch(
	() => props.open,
	(open) => {
		if (!open) setFilter('all');
	},
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="full"
		:container-class="$style.dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.shell" data-test-id="workflow-preview-catalog">
			<!-- Without the filters, the pager shares the header row instead of taking one of its own. -->
			<div :class="[$style.intro, SHOW_FILTERS ? $style.introStacked : $style.introInline]">
				<N8nDialogHeader :class="$style.header">
					<N8nDialogTitle>
						{{ i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.title') }}
					</N8nDialogTitle>
					<N8nDialogDescription>
						{{ i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.subtitle') }}
					</N8nDialogDescription>
				</N8nDialogHeader>

				<div :class="$style.toolbar">
					<div
						v-show="SHOW_FILTERS"
						:class="$style.filters"
						role="group"
						data-test-id="workflow-preview-catalog-filters"
					>
						<N8nButton
							v-for="filter in FILTERS"
							:key="filter.id"
							size="small"
							:variant="activeFilter === filter.id ? 'solid' : 'ghost'"
							:aria-pressed="activeFilter === filter.id"
							:data-test-id="`workflow-preview-catalog-filter-${filter.id}`"
							@click="setFilter(filter.id)"
						>
							{{ i18n.baseText(filter.labelKey) }}
						</N8nButton>
					</div>
					<nav
						v-if="pageCount > 1"
						:class="$style.pager"
						data-test-id="workflow-preview-catalog-pager"
					>
						<span
							:class="$style.dots"
							role="img"
							:aria-label="pageRange"
							data-test-id="workflow-preview-catalog-range"
						>
							<span
								v-for="index in pageCount"
								:key="index"
								:class="[$style.dot, index - 1 === page && $style.dotActive]"
								:data-active="index - 1 === page || undefined"
							/>
						</span>
						<N8nIconButton
							variant="outline"
							size="small"
							icon="chevron-left"
							:disabled="page === 0"
							:aria-label="
								i18n.baseText(
									'experiments.workflowPreviewsAboveAssistant.catalog.pagination.previous',
								)
							"
							data-test-id="workflow-preview-catalog-previous"
							@click="setPage(page - 1)"
						/>
						<N8nIconButton
							variant="outline"
							size="small"
							icon="chevron-right"
							:disabled="page >= pageCount - 1"
							:aria-label="
								i18n.baseText('experiments.workflowPreviewsAboveAssistant.catalog.pagination.next')
							"
							data-test-id="workflow-preview-catalog-next"
							@click="setPage(page + 1)"
						/>
					</nav>
				</div>
			</div>

			<div :class="$style.scroll">
				<div
					:key="`${activeFilter}-${page}`"
					:class="$style.grid"
					data-test-id="workflow-preview-catalog-cards"
				>
					<WorkflowPreviewCard
						v-for="(example, index) in pagedExamples"
						:key="example.id"
						:class="$style.cardEnter"
						:style="{ '--enter-index': index }"
						:example="example"
						:position="examplePosition(example)"
						:active="example.id === detailExample?.id"
						@preview-prompt="detailExampleId = example.id"
						@use="useExample(example)"
					/>
				</div>
				<WorkflowPreviewCatalogDetails
					v-if="detailExample"
					:class="$style.details"
					:example="detailExample"
					@use="useExample(detailExample)"
				/>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
@use './cardEnter';

.dialog {
	// Wide enough for three cards at the size used above the composer.
	--dialog--max-width: min(1120px, 92vw);

	display: flex;
	flex-direction: column;
	// A cap, not a fixed height: the dialog fits its cards and scrolls past this.
	max-height: min(88vh, 900px);
}

// The cards are tuned for the chat page background, so the dialog uses it too.
// The attribute selector outranks the dialog's own surface rule, whatever the
// stylesheet order.
.dialog[role='dialog'] {
	background-color: var(--color--background--light-2);
}

.shell {
	display: flex;
	flex: 0 1 auto;
	flex-direction: column;
	min-height: 0;
	gap: var(--spacing--md);
	container-type: inline-size;
}

.intro {
	display: flex;
	flex-shrink: 0;
	gap: var(--spacing--md);
}

.introStacked {
	flex-direction: column;
}

// Header text on the left, pager on the right at the subtitle's level, clear of the close button.
.introInline {
	align-items: flex-end;
	justify-content: space-between;
}

.header {
	flex-shrink: 0;
	// Leaves room for the dialog close button.
	padding-right: var(--spacing--xl);
}

.toolbar {
	display: flex;
	flex-shrink: 0;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.introInline .toolbar {
	margin-left: auto;
}

.filters {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.pager {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
}

.dots {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-right: var(--spacing--3xs);
}

.dot {
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	border-radius: var(--radius--full);
	background-color: var(--color--text--tint-1);
	opacity: 0.5;
	transition:
		width var(--duration--base) var(--easing--ease-out),
		opacity var(--duration--base) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.dotActive {
	width: var(--spacing--sm);
	background-color: var(--color--text);
	opacity: 1;
}

.scroll {
	flex: 0 1 auto;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	// Keeps the hover border of edge cards from being clipped by the scroll box.
	padding: var(--spacing--5xs);
}

.grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--sm);
	align-items: stretch;
}

.cardEnter {
	@include cardEnter.card-enter;
}

.details {
	margin-top: var(--spacing--sm);
}

@container (max-width: 34rem) {
	.grid {
		grid-template-columns: 1fr;
	}
}
</style>
