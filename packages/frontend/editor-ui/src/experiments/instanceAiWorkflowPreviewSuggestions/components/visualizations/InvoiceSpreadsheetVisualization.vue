<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';

const APPEAR_DELAY_MS = 200;
const ROW_DELAY_MS = 450;
const CHECK_DELAY_MS = ROW_DELAY_MS + 350;
const COMPLETE_DELAY_MS = CHECK_DELAY_MS + 650;

const props = defineProps<{ active: boolean }>();
const emit = defineEmits<{ complete: [] }>();

const visible = ref(false);
const rowVisible = ref(false);
const checkVisible = ref(false);

let timers: Array<ReturnType<typeof setTimeout>> = [];

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers = [];
}

function runAnimation() {
	visible.value = false;
	rowVisible.value = false;
	checkVisible.value = false;

	const base = APPEAR_DELAY_MS;
	timers.push(
		setTimeout(() => {
			visible.value = true;
		}, base),
	);
	timers.push(
		setTimeout(() => {
			rowVisible.value = true;
		}, base + ROW_DELAY_MS),
	);
	timers.push(
		setTimeout(() => {
			checkVisible.value = true;
		}, base + CHECK_DELAY_MS),
	);
	timers.push(
		setTimeout(() => {
			emit('complete');
		}, base + COMPLETE_DELAY_MS),
	);
}

watch(
	() => props.active,
	(val) => {
		if (val) {
			runAnimation();
		} else {
			clearTimers();
			visible.value = false;
			rowVisible.value = false;
			checkVisible.value = false;
		}
	},
	{ immediate: true },
);

onUnmounted(clearTimers);
</script>

<template>
	<div :class="[$style.card, visible && $style.cardVisible]">
		<div :class="$style.table">
			<div :class="[$style.row, $style.rowHeader]">
				<span :class="[$style.cell, $style.th]">Invoice</span>
				<span :class="[$style.cell, $style.th]">Date</span>
				<span :class="[$style.cell, $style.th]">Discrepancy</span>
			</div>

			<div :class="$style.row">
				<span :class="$style.cell">INV-2024-045</span>
				<span :class="$style.cell">May 14</span>
				<span :class="[$style.cell, $style.tdMuted]">—</span>
			</div>

			<div :class="$style.row">
				<span :class="$style.cell">INV-2024-046</span>
				<span :class="$style.cell">May 21</span>
				<span :class="[$style.cell, $style.tdMuted]">—</span>
			</div>

			<div :class="[$style.rowCollapse, rowVisible && $style.rowCollapseOpen]">
				<div :class="[$style.row, $style.rowLast]">
					<span :class="$style.cell">INV-2024-047</span>
					<span :class="$style.cell">May 29</span>
					<span :class="[$style.cell, $style.tdDiscrepancy]">
						<svg
							v-if="checkVisible"
							viewBox="0 0 18 18"
							width="13"
							height="13"
							:class="$style.checkIcon"
						>
							<path
								d="M2.5 9.5 L7 14 L15.5 4"
								fill="none"
								stroke="currentColor"
								stroke-width="2.2"
								stroke-linecap="round"
								stroke-linejoin="round"
								:class="$style.checkPath"
							/>
						</svg>
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
$border: light-dark(
	oklch(from var(--color--neutral-black) l c h / 0.1),
	oklch(from var(--color--neutral-white) l c h / 0.12)
);

.card {
	width: 280px;
	padding: 0;
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: 1px solid $border;
	display: flex;
	flex-direction: column;
	opacity: 0;
	transform: translateX(8px);
	transition:
		opacity 0.3s ease,
		transform 0.3s ease;
	overflow: hidden;
}

.cardVisible {
	opacity: 1;
	transform: translateX(0);
}

.table {
	width: 100%;
}

.row {
	display: grid;
	grid-template-columns: 2fr 1.2fr 1.3fr;
}

.rowHeader {
	background: light-dark(
		oklch(from var(--color--neutral-black) l c h / 0.04),
		oklch(from var(--color--neutral-white) l c h / 0.06)
	);
}

.rowCollapse {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.rowCollapseOpen {
	grid-template-rows: 1fr;
}

.rowLast {
	min-height: 0;
	overflow: hidden;
}

.cell {
	font-size: var(--font-size--2xs);
	line-height: 13px;
	color: var(--color--text--base);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	padding: 6px 9px;
	border-right: 1px solid $border;
	border-bottom: 1px solid $border;

	&:last-child {
		border-right: none;
	}
}

.row:last-of-type .cell {
	border-bottom: none;
}

.rowLast .cell {
	border-bottom: none;
}

.th {
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.tdMuted {
	color: var(--color--text--tint-1);
}

.tdDiscrepancy {
	display: flex;
	align-items: center;
	color: var(--color--warning);
}

.checkIcon {
	overflow: visible;
	flex-shrink: 0;
}

.checkPath {
	stroke-dasharray: 20;
	stroke-dashoffset: 20;
	animation: draw-check 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes draw-check {
	to {
		stroke-dashoffset: 0;
	}
}
</style>
