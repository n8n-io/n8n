<script setup lang="ts">
import { computed } from 'vue';
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	method: string;
	url: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();

const method = computed(() => props.method.toUpperCase());
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="url"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.exchange" data-test-id="http-exchange">
			<div :class="$style.request" data-test-id="http-request-line">
				<NodeBrand :node-id="nodeId" :size="16" />
				<span :class="$style.method">{{ method }}</span>
				<code :class="$style.url">{{ url }}</code>
			</div>
			<div :class="$style.response" data-test-id="http-response-lane">
				<span :class="$style.responseLabel">Response</span>
				<span :class="$style.responseBar" aria-hidden="true" />
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.exchange {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.request {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--background--subtle);
}

.method {
	flex-shrink: 0;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	color: var(--text-color--inverse);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	background: var(--background--inverse);
	border-radius: var(--radius--3xs);
}

.url {
	min-width: 0;
	color: var(--text-color);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}

.response {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border);
}

.responseLabel {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.responseBar {
	flex: 1;
	height: var(--spacing--3xs);
	border-top: var(--border);
	border-top-style: dashed;
}
</style>
