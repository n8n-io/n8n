<script setup lang="ts">
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/*
 * Rotating status text for long-running waits: shows the lead message first,
 * then cycles through quirky n8n-themed messages in a random order.
 * The cycling text is decorative (aria-hidden); a visually-hidden span keeps
 * the lead message stable so enclosing aria-live regions announce it once
 * instead of every few seconds.
 */
const props = defineProps<{ leadKey: BaseTextKey }>();

const CYCLE_KEYS = [
	'desktopAssistant.statusCycle.connectingDots',
	'desktopAssistant.statusCycle.untanglingWires',
	'desktopAssistant.statusCycle.teachingRobots',
	'desktopAssistant.statusCycle.crunchingData',
	'desktopAssistant.statusCycle.pressingButtons',
	'desktopAssistant.statusCycle.heavyLifting',
	'desktopAssistant.statusCycle.loopingItems',
	'desktopAssistant.statusCycle.routingData',
	'desktopAssistant.statusCycle.checkingConnections',
	'desktopAssistant.statusCycle.warmingEngine',
	'desktopAssistant.statusCycle.carryingOnes',
	'desktopAssistant.statusCycle.filteringNoise',
	'desktopAssistant.statusCycle.tighteningBolts',
	'desktopAssistant.statusCycle.countingItems',
	'desktopAssistant.statusCycle.negotiatingApi',
	'desktopAssistant.statusCycle.shufflingBits',
	'desktopAssistant.statusCycle.savingClicks',
	'desktopAssistant.statusCycle.automationMagic',
	'desktopAssistant.statusCycle.polishingResults',
	'desktopAssistant.statusCycle.readingFinePrint',
] as const;

const STEP_MS = 3000;

function shuffled<T>(items: readonly T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

const i18n = useI18n();
const sequence = [props.leadKey, ...shuffled(CYCLE_KEYS)];
const index = ref(0);
const label = computed(() => i18n.baseText(sequence[index.value]));

let timer: number | undefined;
onMounted(() => {
	timer = window.setInterval(() => {
		index.value = (index.value + 1) % sequence.length;
	}, STEP_MS);
});
onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
	<span :class="$style.wrap">
		<span :class="$style.srOnly">{{ i18n.baseText(props.leadKey) }}</span>
		<span aria-hidden="true" :class="$style.message">{{ label }}</span>
	</span>
</template>

<style module>
.wrap {
	display: inline-flex;
	min-width: 0;
}

.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	overflow: hidden;
	white-space: nowrap;
	clip-path: inset(50%);
}

.message {
	display: inline-block;
	background: linear-gradient(100deg, currentcolor 40%, var(--da-text) 50%, currentcolor 60%);
	background-size: 200% 100%;
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: status-shimmer 2.5s linear infinite;
}

@keyframes status-shimmer {
	from {
		background-position: 200% 0;
	}

	to {
		background-position: -200% 0;
	}
}
</style>
