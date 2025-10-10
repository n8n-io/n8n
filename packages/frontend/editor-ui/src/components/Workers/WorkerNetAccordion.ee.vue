<script setup lang="ts">
import type { WorkerStatus } from '@n8n/api-types';
import WorkerAccordion from './WorkerAccordion.ee.vue';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
	items: WorkerStatus['interfaces'];
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const { showMessage } = useToast();

function onCopyToClipboard(content: string) {
	try {
		void clipboard.copy(content);
		showMessage({
			title: i18n.baseText('workerList.item.copyAddressToClipboard'),
			type: 'success',
		});
	} catch {}
}
</script>

<template>
	<WorkerAccordion icon="list-checks" icon-color="text-dark" :initial-expanded="false">
		<template #title>
			{{ i18n.baseText('workerList.item.netListTitle') }} ({{ items.length }})
		</template>
		<template #content>
			<div v-if="props.items.length > 0" :class="$style.accordionItems">
				<div
					v-for="item in props.items"
					:key="item.address"
					:class="$style.accordionItem"
					@click="onCopyToClipboard(item.address)"
				>
					{{ item.family }}: <span :class="$style.clickable">{{ item.address }}</span>
					{{ item.internal ? '(internal)' : '' }}
				</div>
			</div>
		</template>
	</WorkerAccordion>
</template>

<style lang="scss" module>
.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
	margin-top: var(--spacing--2xs);
}

.accordionItem {
	display: block !important;
	text-align: left;
	margin-bottom: var(--spacing--4xs);
}

.clickable {
	cursor: pointer !important;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
