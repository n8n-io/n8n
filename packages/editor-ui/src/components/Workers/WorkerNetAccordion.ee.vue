<template>
	<WorkerAccordion icon="tasks" icon-color="black" :initial-expanded="false">
		<template #title>
			{{ $locale.baseText('workerList.item.netListTitle') }} ({{ items.length }})
		</template>
		<template #content>
			<div v-if="props.items.length > 0" :class="$style.accordionItems">
				<div
					v-for="item in props.items"
					:key="item.address"
					:class="$style.accordionItem"
					@click="copyToClipboard(item.address)"
				>
					{{ item.family }}: <span :class="$style.clickable">{{ item.address }}</span>
					{{ item.internal ? '(internal)' : '' }}
				</div>
			</div>
		</template>
	</WorkerAccordion>
</template>

<script setup lang="ts">
import type { IPushDataWorkerStatusPayload } from '@/Interface';
import WorkerAccordion from './WorkerAccordion.ee.vue';
import { useCopyToClipboard, useToast, useI18n } from '@/composables';

const props = defineProps<{
	items: IPushDataWorkerStatusPayload['interfaces'];
}>();

const i18n = useI18n();

function copyToClipboard(content: string) {
	const copyToClipboardFn = useCopyToClipboard();
	const { showMessage } = useToast();

	try {
		copyToClipboardFn(content);
		showMessage({
			title: i18n.baseText('workerList.item.copyAddressToClipboard'),
			type: 'success',
		});
	} catch {}
}
</script>

<style lang="scss" module>
.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
	margin-top: var(--spacing-2xs);
}

.accordionItem {
	display: block !important;
	text-align: left;
	margin-bottom: var(--spacing-4xs);
}

.clickable {
	cursor: pointer !important;

	&:hover {
		color: var(--color-primary);
	}
}
</style>
