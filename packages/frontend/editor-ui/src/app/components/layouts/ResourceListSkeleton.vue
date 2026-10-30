<script lang="ts" setup>
import { computed, inject } from 'vue';

import ResourceListHeader from './ResourceListHeader.vue';
import ResourceListRow from './ResourceListRow.vue';
import { ResourceListColumnsKey } from './resourceListColumns';

const { rows = 10, header = true } = defineProps<{
	rows?: number;
	/** Show the column header above the rows. Turn it off below a loaded list */
	header?: boolean;
}>();

// Columns that get a placeholder bar. Other columns, such as row actions, stay empty.
const BAR_COLUMNS = ['location', 'updated', 'created'];

// Vary the name lengths, so the placeholder reads as a list of names and not as a grid
const NAME_WIDTHS = ['40%', '28%', '48%', '34%', '24%', '44%', '32%', '38%'];

const columns = inject(ResourceListColumnsKey, undefined);

const barColumns = computed(
	() => columns?.value?.map(({ key }) => key).filter((key) => BAR_COLUMNS.includes(key)) ?? [],
);

const nameWidths = computed(() =>
	Array.from({ length: rows }, (_, index) => NAME_WIDTHS[index % NAME_WIDTHS.length]),
);
</script>

<template>
	<div :class="$style.skeleton" data-test-id="resources-list-skeleton" aria-hidden="true">
		<ResourceListHeader v-if="header" :class="$style.header" />
		<div :class="$style.rows">
			<div v-for="(nameWidth, index) in nameWidths" :key="index" :class="$style.row">
				<ResourceListRow>
					<template #name>
						<span :class="$style.icon" />
						<span :class="[$style.bar, $style.name]" :style="{ width: nameWidth }" />
					</template>
					<template v-for="key in barColumns" :key="key" #[key]>
						<span :class="[$style.bar, $style[key]]" />
					</template>
				</ResourceListRow>
			</div>
			<div :class="$style.sweep" />
		</div>
	</div>
</template>

<style lang="scss" module>
.skeleton {
	--resource-list-skeleton--color: var(--background--active);
}

// Match the column header of a loaded list
.header {
	margin-inline: var(--spacing--4xs);
}

.rows {
	position: relative;
	overflow: hidden;
}

// Match a loaded row: a card with a border, its padding, and a row of icon-button height
.row {
	margin-inline: var(--spacing--4xs);
	padding: calc(var(--spacing--xs) + var(--border-width, 1px))
		calc(var(--spacing--sm) + var(--border-width, 1px));

	> * {
		min-height: var(--height--sm);
	}
}

.icon {
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: var(--radius--3xs);
	background-color: var(--resource-list-skeleton--color);
}

.bar {
	display: block;
	height: var(--spacing--2xs);
	border-radius: var(--radius--3xs);
	background-color: var(--resource-list-skeleton--color);
}

.name {
	height: var(--spacing--xs);
}

.location {
	width: var(--spacing--4xl);
}

.updated {
	width: var(--spacing--3xl);
}

.created {
	width: calc(var(--spacing--3xl) + var(--spacing--xs));
}

// A soft highlight that moves across the rows
.sweep {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: linear-gradient(
		100deg,
		transparent 30%,
		color-mix(in srgb, var(--background--surface) 75%, transparent) 50%,
		transparent 70%
	);
	background-size: 200% 100%;
	animation: resource-list-skeleton-sweep var(--duration--slowest) ease-in-out infinite;

	@media (prefers-reduced-motion: reduce) {
		display: none;
	}
}

@keyframes resource-list-skeleton-sweep {
	from {
		background-position: 150% 0;
	}

	to {
		background-position: -50% 0;
	}
}
</style>
