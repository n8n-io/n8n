<script setup lang="ts">
import type { PromotionMissingDependency } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { usePromotionUnresolvedSummary } from '../composables/usePromotionUnresolvedSummary';
import PromotionUnresolvedSummary from './PromotionUnresolvedSummary.vue';

/**
 * The confirmation of an Apply that leaves dependencies unresolved. It replaces the generic
 * confirmation, so the user answers one time. Mount it only while the question is open.
 */
const props = defineProps<{
	/** The dependencies that the Apply leaves unresolved, for the workflows that it includes. */
	dependencies: PromotionMissingDependency[];
	/** The count of changes on the button that opened the dialog. */
	changeCount: number;
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const i18n = useI18n();
const { lead, rows } = usePromotionUnresolvedSummary(() => props.dependencies, 'apply');

// The confirm button repeats the label of the button that opened the dialog.
const counted = (key: 'promotions.unresolved.title.apply' | 'promotions.preview.submit.apply') =>
	i18n.baseText(key, {
		adjustToNumber: props.changeCount,
		interpolate: { count: String(props.changeCount) },
	});
</script>

<template>
	<N8nDialog
		open
		size="medium"
		:aria-description="lead"
		data-test-id="apply-unresolved-dialog"
		@update:open="emit('cancel')"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ counted('promotions.unresolved.title.apply') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<PromotionUnresolvedSummary :lead="lead" :rows="rows" />
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="apply-unresolved-cancel"
				@click="emit('cancel')"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton type="button" data-test-id="apply-unresolved-confirm" @click="emit('confirm')">
				{{ counted('promotions.preview.submit.apply') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>
