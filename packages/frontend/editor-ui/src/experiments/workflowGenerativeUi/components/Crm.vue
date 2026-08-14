<script setup lang="ts">
import { computed } from 'vue';
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	app: string;
	operation: string;
	object: string;
	matchOn?: string | null;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();

const monogram = computed(() => props.object.trim().charAt(0).toUpperCase());
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="`${operation} ${object}`"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<article :class="$style.record" data-test-id="crm-record">
			<div :class="$style.identity">
				<span :class="$style.monogram" aria-hidden="true">{{ monogram }}</span>
				<div :class="$style.naming">
					<strong :class="$style.object">{{ object }}</strong>
					<span :class="$style.operation">{{ operation }}</span>
				</div>
				<NodeBrand :node-id="nodeId" :size="16" />
			</div>
			<dl :class="$style.details">
				<div :class="$style.row">
					<dt>Source</dt>
					<dd>{{ app }}</dd>
				</div>
				<div v-if="matchOn" :class="$style.row" data-test-id="crm-match">
					<dt>Matched on</dt>
					<dd>{{ matchOn }}</dd>
				</div>
			</dl>
		</article>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.record {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-left: var(--spacing--4xs) solid var(--border-color--strong);
	border-radius: var(--radius--sm);
}

.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.monogram {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--height--md);
	height: var(--height--md);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--full);
}

.naming {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.object {
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.operation {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.row {
	display: grid;
	grid-template-columns: minmax(var(--spacing--3xl), auto) 1fr;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--xs);
}

.row dt {
	color: var(--text-color--subtler);
}

.row dd {
	min-width: 0;
	margin: 0;
	color: var(--text-color);
	overflow-wrap: anywhere;
}
</style>
