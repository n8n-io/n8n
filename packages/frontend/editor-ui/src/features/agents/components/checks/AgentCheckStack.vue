<script setup lang="ts">
/**
 * Suggested checks in one container with hairline rows. The parent passes them
 * newest first, so what the slider just added shows at the top. Past three, the
 * rest pile into a stack of edges under the container with "+N more"; a click
 * opens the full list in place. The `top` slot holds an add-your-own input row.
 * With `reserve` (how many could be picked) past three, the stack keeps one size
 * while the slider moves: three rows, the "more" bar and the edges always take
 * their space, shown or not.
 */
import { computed, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentReaction from './AgentReaction.vue';

const VISIBLE = 3;

const props = defineProps<{
	items: Array<{ key: number | string; kind: string | null; input: string }>;
	reserve?: number;
}>();

const i18n = useI18n();
const open = ref(false);

const extra = computed(() => Math.max(0, props.items.length - VISIBLE));
const shown = computed(() =>
	open.value || extra.value === 0 ? props.items : props.items.slice(0, VISIBLE),
);
const stacked = computed(() => !open.value && extra.value > 0);
// Below three picked rows the stack is as tall as its rows; from three up it holds one size.
const fixedSize = computed(
	() => !open.value && (props.reserve ?? 0) > VISIBLE && props.items.length >= VISIBLE,
);
</script>

<template>
	<div
		:class="[$style.stack, { [$style.stacked]: stacked || fixedSize, [$style.fixed]: fixedSize }]"
		data-testid="agent-check-stack"
	>
		<div :class="$style.box">
			<slot name="top" />
			<TransitionGroup
				tag="div"
				:class="$style.rows"
				:enter-from-class="$style.enterFrom"
				:enter-active-class="$style.enterActive"
				:leave-active-class="$style.leaveActive"
				:leave-to-class="$style.leaveTo"
				:move-class="$style.move"
			>
				<div v-for="item in shown" :key="item.key" :class="$style.row">
					<AgentReaction kind="idle" size="sm" />
					<span :class="$style.text">
						<span :class="$style.kind">{{ item.kind }}</span>
						<span :class="$style.prompt">{{ item.input }}</span>
					</span>
				</div>
			</TransitionGroup>
			<button
				v-if="extra > 0 || fixedSize"
				:disabled="extra === 0"
				type="button"
				:class="$style.more"
				:aria-expanded="open"
				data-testid="agent-check-stack-more"
				@click="open = !open"
			>
				{{
					open
						? i18n.baseText('agents.builder.agentChecks.onboarding.fewer')
						: i18n.baseText('agents.builder.agentChecks.onboarding.moreCount', {
								interpolate: { count: String(extra) },
							})
				}}
				<N8nIcon :icon="open ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
		</div>
		<template v-if="stacked || fixedSize">
			<i :class="[$style.edge, $style.edge1, { [$style.ghost]: !stacked }]" aria-hidden="true" />
			<i
				:class="[$style.edge, $style.edge2, { [$style.ghost]: !stacked || extra < 2 }]"
				aria-hidden="true"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.stack {
	// Kind line, two message lines and the padding.
	--stack-row: calc(
		var(--font-size--2xs) * var(--line-height--md) + 2 * var(--font-size--sm) *
			var(--line-height--xl) + 2 * var(--spacing--2xs)
	);

	position: relative;
}

.stacked {
	padding-bottom: 10px;
}

.box {
	position: relative;
	display: flex;
	flex-direction: column;
	z-index: 2;
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);

	> * + * {
		border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

.rows {
	position: relative;
	display: flex;
	flex-direction: column;

	> * + * {
		border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

// Three rows tall whatever the count, so the card doesn't resize as the slider moves.
.fixed .rows {
	min-height: calc(3 * var(--stack-row) + 2 * var(--border-width));
}

// Shown or not, the "more" bar and the edges keep their space.
.fixed .more:disabled {
	visibility: hidden;
}

.ghost {
	visibility: hidden;
}

// Every row is the same height (kind line plus two message lines), so swaps never resize.
.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	box-sizing: border-box;
	height: var(--stack-row);
	padding: var(--spacing--2xs);
	font-size: var(--font-size--sm);
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.kind {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.prompt {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	line-height: var(--line-height--xl);
}

.more {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	width: 100%;
	height: var(--height--md);
	border: 0;
	background: var(--background--subtle);
	font: inherit;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: -2px;
	}
}

.edge {
	position: absolute;
	height: 14px;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-top: 0;
	border-radius: 0 0 var(--radius) var(--radius);
	pointer-events: none;
}

.edge1 {
	right: 6px;
	bottom: 5px;
	left: 6px;
	z-index: 1;
	background: var(--background--surface);
}

.edge2 {
	right: 12px;
	bottom: 0;
	left: 12px;
	z-index: 0;
	background: var(--background--subtle);
}

// The row leaving at the bottom fades out of the flow, so the box never grows in between.
.leaveActive {
	position: absolute;
	right: 0;
	left: 0;
	transition: opacity 0.12s ease-out;
}

.leaveTo {
	opacity: 0;
}

// Only the row the slider just added moves; the rest slide down under it, so dragging stays calm.
.enterActive,
.move {
	transition:
		opacity 0.16s ease-out,
		transform 0.16s ease-out;
}

.enterFrom {
	opacity: 0;
	transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
	.enterActive,
	.move {
		transition: none;
	}
}
</style>
