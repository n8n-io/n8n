<script setup lang="ts">
/**
 * Suggested checks in one container with hairline rows. The parent passes them
 * newest first, so what the slider just added shows at the top. Past three, the
 * rest pile into a stack of edges under the container with "+N more"; a click
 * opens the full list in place. The `top` slot holds an add-your-own input row.
 */
import { computed, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentReaction from './AgentReaction.vue';

const VISIBLE = 3;

const props = defineProps<{
	items: Array<{ key: number | string; kind: string | null; input: string }>;
}>();

const i18n = useI18n();
const open = ref(false);

const extra = computed(() => Math.max(0, props.items.length - VISIBLE));
const shown = computed(() =>
	open.value || extra.value === 0 ? props.items : props.items.slice(0, VISIBLE),
);
const stacked = computed(() => !open.value && extra.value > 0);
</script>

<template>
	<div :class="[$style.stack, { [$style.stacked]: stacked }]" data-testid="agent-check-stack">
		<div :class="$style.box">
			<slot name="top" />
			<TransitionGroup
				:enter-from-class="$style.enterFrom"
				:enter-active-class="$style.enterActive"
			>
				<div v-for="item in shown" :key="item.key" :class="$style.row">
					<AgentReaction kind="idle" size="row" />
					<span :class="$style.kind">{{ item.kind }}</span>
					<span :class="$style.prompt">{{ item.input }}</span>
				</div>
			</TransitionGroup>
			<button
				v-if="extra > 0"
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
		<template v-if="stacked">
			<i :class="[$style.edge, $style.edge1]" aria-hidden="true" />
			<i v-if="extra > 1" :class="[$style.edge, $style.edge2]" aria-hidden="true" />
		</template>
	</div>
</template>

<style lang="scss" module>
.stack {
	position: relative;
}

.stacked {
	padding-bottom: 10px;
}

.box {
	position: relative;
	z-index: 2;
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);

	> * + * {
		border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--sm);
}

.kind {
	flex-shrink: 0;
	width: 96px;
	overflow: hidden;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.prompt {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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

.enterActive {
	transition:
		opacity 0.22s ease,
		background-color 0.6s ease;
}

.enterFrom {
	opacity: 0;
	background-color: color-mix(in srgb, var(--color--primary) 12%, transparent);
}

@media (prefers-reduced-motion: reduce) {
	.enterActive {
		transition: none;
	}
}
</style>
