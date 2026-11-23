<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { PromotionOutsideAccessDependency } from '../promotions.types';
import PromotionUnresolvedSummary from './PromotionUnresolvedSummary.vue';

/**
 * The confirmation of an Apply that leaves out dependencies. It takes the place of the generic
 * confirmation, so the user answers once.
 */
const props = defineProps<{
	open: boolean;
	changeCount: number;
	dependencies: PromotionOutsideAccessDependency[];
}>();

const emit = defineEmits<{
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const title = computed(() =>
	i18n.baseText('promotions.unresolved.title.apply', {
		adjustToNumber: props.dependencies.length,
		interpolate: { count: String(props.dependencies.length) },
	}),
);

// The button repeats the label of the button that opened the dialog.
const confirmLabel = computed(() =>
	i18n.baseText('promotions.preview.submit.apply', {
		adjustToNumber: props.changeCount,
		interpolate: { count: String(props.changeCount) },
	}),
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		data-test-id="promotion-unresolved-dialog"
		@update:open="!$event && emit('cancel')"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<PromotionUnresolvedSummary :dependencies="dependencies" direction="apply" />
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="promotion-unresolved-cancel"
				@click="emit('cancel')"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton type="button" data-test-id="promotion-unresolved-confirm" @click="emit('confirm')">
				{{ confirmLabel }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>
