<template>
	<WorkerAccordion icon="tasks" icon-color="black" :initial-expanded="false">
		<template #title>
			{{ $locale.baseText('workerList.item.netListTitle') }} ({{ items.length }})
		</template>
		<template #content>
			<div v-if="props.items.length > 0" :class="$style.accordionItems">
				<div v-for="item in props.items" :key="item.address" :class="$style.accordionItem">
					{{ item.family }}: {{ item.address }} {{ item.internal ? '(internal)' : '' }}
				</div>
			</div>
		</template>
	</WorkerAccordion>
</template>

<script setup lang="ts">
import type { IPushDataWorkerStatusPayload } from '@/Interface';
import WorkerAccordion from './WorkerAccordion.vue';

const props = defineProps<{
	items: IPushDataWorkerStatusPayload['interfaces'];
}>();
</script>

<style lang="scss" module>
.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
}

.accordionItem {
	display: block !important;
	text-align: left;
	margin-bottom: var(--spacing-4xs);
}
</style>
