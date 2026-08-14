<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { archetypeSections } from './archetypeSections';

defineProps<{
	inboundLabel?: string | null;
	outboundLabel?: string | null;
}>();

const slots = useSlots();

const sections = computed(() => archetypeSections(slots.default?.()));
const inbound = computed(() => sections.value.slice(0, 1));
const outbound = computed(() => sections.value.slice(1));
</script>

<template>
	<section
		:class="$style.ends"
		data-test-id="flow-ends"
		role="group"
		aria-label="What comes in and what goes out"
	>
		<div :class="$style.side" data-test-id="ends-inbound">
			<span :class="$style.label">{{ inboundLabel ?? 'Comes in' }}</span>
			<div :class="$style.body">
				<component :is="section" v-for="(section, index) in inbound" :key="index" />
			</div>
		</div>
		<div :class="$style.side" data-test-id="ends-outbound">
			<span :class="$style.label">{{ outboundLabel ?? 'Goes out' }}</span>
			<div :class="$style.body">
				<component :is="section" v-for="(section, index) in outbound" :key="index" />
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.ends {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
	min-width: 0;
}

.side {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--md);
}

.label {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	flex: 1;
}

@media (max-width: 640px) {
	.ends {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
