<script lang="ts" setup>
import { N8nAiActivityStepChevron, N8nAnimatedCollapsibleContent } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, onUnmounted, ref, watch } from 'vue';
import { firstSentence } from '../thinking.utils';

const props = withDefaults(
	defineProps<{
		segments: Array<{ content: string }>;
		active: boolean;
		awaitingInput?: boolean;
		activityLabel?: string;
		durationSec?: number;
		testId?: string;
	}>(),
	{
		awaitingInput: false,
		activityLabel: undefined,
		durationSec: undefined,
		testId: 'ai-thinking-block',
	},
);

const i18n = useI18n();
const userToggled = ref<boolean | null>(null);
const expanded = computed(() => userToggled.value ?? false);

watch(
	() => props.active,
	() => {
		userToggled.value = null;
	},
);

const nowMs = ref(Date.now());
const activeSinceMs = ref<number | null>(null);
const settledElapsedSec = ref(0);
let ticker: ReturnType<typeof setInterval> | null = null;

const elapsedSec = computed(() => {
	const live =
		activeSinceMs.value === null
			? 0
			: Math.max(0, Math.floor((nowMs.value - activeSinceMs.value) / 1000));
	return settledElapsedSec.value + live;
});

const isCounting = computed(() => props.active && !props.awaitingInput);

watch(
	isCounting,
	(counting) => {
		if (counting) {
			nowMs.value = Date.now();
			activeSinceMs.value = Date.now();
			ticker ??= setInterval(() => {
				nowMs.value = Date.now();
			}, 1000);
			return;
		}

		settledElapsedSec.value = props.awaitingInput ? 0 : elapsedSec.value;
		activeSinceMs.value = null;
		if (ticker) {
			clearInterval(ticker);
			ticker = null;
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	if (ticker) clearInterval(ticker);
});

function formatDuration(totalSec: number): string {
	if (totalSec < 60) return `${totalSec}s`;
	return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

const elapsedLabel = computed<string | undefined>(() => {
	return elapsedSec.value >= 1 ? formatDuration(elapsedSec.value) : undefined;
});

const title = computed<{ key: string; text: string }>(() => {
	if (!props.active) {
		const observed = settledElapsedSec.value >= 1 ? settledElapsedSec.value : undefined;
		const duration =
			props.durationSec === undefined
				? observed
				: observed === undefined
					? props.durationSec
					: Math.max(props.durationSec, observed);
		return {
			key: 'done',
			text:
				duration === undefined
					? i18n.baseText('ai.thinking.doneFallback')
					: i18n.baseText('ai.thinking.done', {
							interpolate: { duration: formatDuration(duration) },
						}),
		};
	}

	if (props.awaitingInput) {
		return { key: 'waiting', text: i18n.baseText('ai.thinking.waitingForInput') };
	}

	for (let index = props.segments.length - 1; index >= 0; index--) {
		const sentence = firstSentence(props.segments[index].content);
		if (sentence) return { key: `segment-${index}`, text: sentence };
	}

	return { key: 'active', text: i18n.baseText('ai.thinking.active') };
});
</script>

<template>
	<CollapsibleRoot
		:open="expanded"
		:data-test-id="props.testId"
		@update:open="(value) => (userToggled = value)"
	>
		<CollapsibleTrigger as-child>
			<button
				type="button"
				:class="$style.header"
				:aria-expanded="expanded"
				data-test-id="thinking-block-header"
			>
				<Transition name="thinking-title" mode="out-in">
					<span :key="title.key" :class="$style.title">{{ title.text }}</span>
				</Transition>
				<span v-if="expanded && isCounting && elapsedLabel" :class="$style.headerElapsed">
					{{ elapsedLabel }}
				</span>
				<N8nAiActivityStepChevron :open="expanded" />
			</button>
		</CollapsibleTrigger>
		<div
			v-if="props.active && !props.awaitingInput && !expanded"
			:class="$style.subline"
			data-test-id="thinking-block-subline"
		>
			<span :class="$style.sublineLabel">
				{{ props.activityLabel ?? i18n.baseText('ai.thinking.active') }}
			</span>
			<span v-if="elapsedLabel" :class="$style.sublineElapsed"> &middot; {{ elapsedLabel }} </span>
		</div>
		<N8nAnimatedCollapsibleContent>
			<div :class="$style.content"><slot /></div>
		</N8nAnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" scoped>
.thinking-title-enter-active {
	transition: opacity var(--duration--snappy) ease;
}

.thinking-title-enter-from {
	opacity: 0;
}
</style>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	border: 0;
	background: transparent;
	padding: var(--spacing--4xs) 0;
	cursor: pointer;
	text-align: left;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);

	&:hover {
		color: var(--text-color--subtle);
	}
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerElapsed,
.sublineElapsed {
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
}

.subline {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	max-width: 90%;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtler);
}

.sublineLabel {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;

	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0 var(--spacing--3xs) var(--spacing--2xs);
	border-left: var(--border);
	margin-left: var(--spacing--xs);
}
</style>
