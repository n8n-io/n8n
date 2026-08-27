<!-- Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment -->
<script lang="ts" setup>
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useResizeObserver } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useInstanceAiTemplateExamplesStore } from '../instanceAiTemplateExamples.store';
import {
	GRID_REVEAL_DELAY_MS,
	MAX_VISIBLE_FULL,
	MAX_VISIBLE_COMPACT,
	MIN_HEIGHT_FOR_FULL_PX,
	MIN_HEIGHT_FOR_COMPACT_PX,
	NAV_BUTTON_OFFSET_PX,
	GRID_HEIGHT_FULL_PX,
	GRID_HEIGHT_COMPACT_PX,
} from '../constants';
import TemplateCategoryBar from './TemplateCategoryBar.vue';
import TemplateSubcategoryBar from './TemplateSubcategoryBar.vue';
import TemplateExampleCard from './TemplateExampleCard.vue';

const emit = defineEmits<{
	'hover-prompt': [prompt: string];
	'hover-end': [];
	'select-prompt': [prompt: string];
}>();

const i18n = useI18n();
const store = useInstanceAiTemplateExamplesStore();
const {
	categories,
	selectedCategoryId,
	selectedSubcategory,
	subcategories,
	workflows,
	isLoading,
	totalPages,
	hasNextPage,
	hasPrevPage,
} = storeToRefs(store);
const compact = ref(false);
const extraCompact = ref(false);
const navAtBottom = ref(false);
const containerRef = useTemplateRef<HTMLElement>('catalogContainer');

const gridAreaStyle = computed(() => {
	const value = compact.value ? `${GRID_HEIGHT_COMPACT_PX}px` : `${GRID_HEIGHT_FULL_PX}px`;
	if (navAtBottom.value) return { minHeight: value };
	return { height: value };
});

// Handles prevention of horizontal and vertical overflow of the templates grid and lateral buttons
useResizeObserver(document.body, () => {
	if (!containerRef.value) return;
	const rect = containerRef.value.getBoundingClientRect();
	const available = window.innerHeight - rect.top;
	compact.value = available < MIN_HEIGHT_FOR_FULL_PX;
	extraCompact.value = available < MIN_HEIGHT_FOR_COMPACT_PX;

	let overflowAncestor = containerRef.value.parentElement;
	while (overflowAncestor) {
		const style = getComputedStyle(overflowAncestor);
		if (style.overflow === 'hidden' || style.overflowX === 'hidden') break;
		overflowAncestor = overflowAncestor.parentElement;
	}
	if (overflowAncestor) {
		const parentRect = overflowAncestor.getBoundingClientRect();
		const spaceLeft = rect.left - parentRect.left;
		const spaceRight = parentRect.right - rect.right;
		navAtBottom.value = spaceLeft < NAV_BUTTON_OFFSET_PX || spaceRight < NAV_BUTTON_OFFSET_PX;
	} else {
		navAtBottom.value = rect.left < NAV_BUTTON_OFFSET_PX;
	}
});

const visibleWorkflows = computed(() =>
	workflows.value.slice(0, compact.value ? MAX_VISIBLE_COMPACT : MAX_VISIBLE_FULL),
);
const gridRevealed = ref(false);

onMounted(() => {
	void store.initialize();
	setTimeout(() => {
		gridRevealed.value = true;
	}, GRID_REVEAL_DELAY_MS);
});
</script>

<template>
	<div ref="catalogContainer" :class="$style.container">
		<div :class="subcategories.length > 0 ? undefined : $style.barsSpacing">
			<TemplateCategoryBar
				:categories="categories"
				:selected-category-id="selectedCategoryId"
				:compact="compact"
				:extra-compact="extraCompact"
				@select="store.selectCategory"
			/>
		</div>

		<TemplateSubcategoryBar
			v-if="subcategories.length > 0"
			:subcategories="subcategories"
			:selected-subcategory="selectedSubcategory"
			@select="store.selectSubcategory"
		/>

		<div :class="[$style.gridArea, gridRevealed && $style.gridRevealed]" :style="gridAreaStyle">
			<button
				v-if="totalPages > 1 && hasPrevPage && !navAtBottom"
				:class="$style.navButton"
				:aria-label="
					i18n.baseText('experiments.instanceAiTemplateExamples.nav.previous' as BaseTextKey)
				"
				@click="store.prevPage()"
			>
				<N8nIcon icon="chevron-left" size="medium" />
			</button>

			<div
				v-if="isLoading && visibleWorkflows.length === 0"
				:class="[$style.grid, compact && $style.gridCompact]"
			>
				<div v-for="n in compact ? 2 : 4" :key="n" :class="$style.skeletonCard">
					<div :class="$style.skeletonTitle">
						<N8nLoading :rows="1" :loading="true" />
					</div>
					<div :class="$style.skeletonFooter">
						<N8nLoading :rows="1" :loading="true" />
					</div>
				</div>
			</div>

			<div
				v-else-if="visibleWorkflows.length > 0"
				:class="[$style.grid, compact && $style.gridCompact, isLoading && $style.gridLoading]"
			>
				<TemplateExampleCard
					v-for="workflow in visibleWorkflows"
					:key="workflow.id"
					:workflow="workflow"
					:selected-category="categories.find((c) => String(c.id) === selectedCategoryId)?.name"
					:selected-subcategory="selectedSubcategory || undefined"
					:show-all-nodes="!selectedCategoryId"
					@hover="emit('hover-prompt', $event)"
					@hover-end="emit('hover-end')"
					@select="emit('select-prompt', $event)"
				/>
			</div>

			<div v-else :class="$style.empty">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('experiments.instanceAiTemplateExamples.empty' as BaseTextKey) }}
				</N8nText>
			</div>

			<button
				v-if="totalPages > 1 && hasNextPage && !navAtBottom"
				:class="$style.navButton"
				:aria-label="
					i18n.baseText('experiments.instanceAiTemplateExamples.nav.next' as BaseTextKey)
				"
				@click="store.nextPage()"
			>
				<N8nIcon icon="chevron-right" size="medium" />
			</button>
		</div>

		<div
			v-if="totalPages > 1 && navAtBottom && (hasPrevPage || hasNextPage)"
			:class="$style.bottomNav"
		>
			<button
				v-if="hasPrevPage"
				:class="$style.bottomNavButton"
				:aria-label="
					i18n.baseText('experiments.instanceAiTemplateExamples.nav.previous' as BaseTextKey)
				"
				@click="store.prevPage()"
			>
				<N8nIcon icon="chevron-left" size="medium" />
			</button>
			<button
				v-if="hasNextPage"
				:class="$style.bottomNavButton"
				:aria-label="
					i18n.baseText('experiments.instanceAiTemplateExamples.nav.next' as BaseTextKey)
				"
				@click="store.nextPage()"
			>
				<N8nIcon icon="chevron-right" size="medium" />
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	max-width: 1014px;
	min-width: 0;
	margin: 0 auto;
}

.barsSpacing {
	margin-bottom: 16px;
}

.gridArea {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: visible;
	opacity: 0;
	transition: opacity 0.3s ease;
}

.gridRevealed {
	opacity: 1;
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	grid-template-rows: repeat(2, 1fr);
	gap: 12px;
	width: 100%;
	height: 100%;
}

.gridCompact {
	grid-template-rows: 1fr;
}

.gridLoading {
	opacity: 0.5;
	pointer-events: none;
	transition: opacity 0.15s ease;
}

.skeletonCard {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: var(--spacing--sm);
	background: var(--color--foreground--tint-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
}

.skeletonTitle {
	min-height: 3.1em;
	line-height: 1.55;
	margin-bottom: var(--spacing--xs);
}

.skeletonFooter {
	height: 32px;
	width: 120px;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	width: 100%;
}

.navButton {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: none;
	background: transparent;
	color: var(--color--text);
	cursor: pointer;
	transition: background 0.15s ease;

	&:hover {
		background: var(--color--foreground--tint-1);
	}

	&:first-child {
		left: -48px;
	}

	&:last-child {
		right: -48px;
	}
}

.bottomNav {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 12px;
}

.bottomNavButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: none;
	background: transparent;
	color: var(--color--text);
	cursor: pointer;
	transition: background 0.15s ease;

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}
</style>
