<script setup lang="ts">
import { computed, useSlots, type VNode } from 'vue';

/** Must match the row styles below: td height (48px) + 1px border-bottom. */
const ROW_HEIGHT_PX = 49;
/** Must match the header styles below: th height (36px) + 1px border-bottom. */
const HEADER_HEIGHT_PX = 37;

interface TableBaseProps {
	/**
	 * Maximum number of body rows visible before the table scrolls vertically.
	 * Unset (default): the table grows with its content, exactly as before.
	 * Counts body rows only — a sticky `thead`, if present, adds its own
	 * height on top so it doesn't eat into the body rows' visible space.
	 */
	maxDisplayedRows?: number;
}

const props = defineProps<TableBaseProps>();
const slots = useSlots();

const hasHeader = computed(() =>
	(slots.default?.({}) ?? []).some((vnode: VNode) => vnode.type === 'thead'),
);

const scrollStyle = computed(() => {
	if (!props.maxDisplayedRows) return undefined;
	const headerHeight = hasHeader.value ? HEADER_HEIGHT_PX : 0;
	return { maxHeight: `${props.maxDisplayedRows * ROW_HEIGHT_PX + headerHeight}px` };
});
</script>

<template>
	<div :class="$style.n8nTable">
		<div :class="$style.n8nTableScroll" :style="scrollStyle" data-test-id="table-base-scroll">
			<table>
				<slot />
			</table>
		</div>
	</div>
</template>

<style lang="scss" module>
.n8nTableScroll {
	max-height: 100%;
	overflow: auto;
	position: relative;
}
.n8nTable {
	height: 100%;
	border-radius: 8px;
	border: 1px solid var(--color--foreground);
	overflow: hidden;
	font-size: var(--font-size--sm);

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		white-space: nowrap;

		> thead {
			position: sticky;
			top: 0;
			z-index: 2;
		}
	}

	th,
	td {
		text-align: left;
	}

	th {
		background-color: var(--color--background--light-1);
		color: var(--color--text);
		font-weight: 600;
		font-size: 12px;
		padding: 0 8px;
		text-transform: capitalize;
		height: 36px;
		white-space: nowrap;
		border-bottom: 1px solid var(--color--foreground);

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}
	}

	tbody > tr {
		&:hover {
			background-color: var(--color--background--light-2);
		}

		&:last-child > td {
			border-bottom: 0;
		}
	}

	tr {
		background-color: var(--color--background--light-3);
	}

	td {
		color: var(--color--text--shade-1);
		padding: 0 8px;
		height: 48px;

		border-bottom: 1px solid var(--color--foreground);

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}
	}
}
</style>
