<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { usePromotionReviewStore } from '../promotionReview.store';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import {
	N8nButton,
	N8nHeading,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

const i18n = useI18n();
const toast = useToast();
const store = usePromotionReviewStore();
const { producibleWorkflows, isMarkingForDeployment } = storeToRefs(store);

const selectedWorkflowIds = ref<string[]>([]);
const targetEnv = ref('production');

const canSubmit = computed(
	() => selectedWorkflowIds.value.length > 0 && targetEnv.value.trim() && !isMarkingForDeployment.value,
);

onMounted(async () => {
	try {
		await store.loadProducibleWorkflows();
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.produce.toast.loadError'));
	}
});

async function onMark() {
	if (!canSubmit.value) return;
	try {
		const result = await store.markForDeployment({
			workflowIds: selectedWorkflowIds.value,
			targetEnv: targetEnv.value.trim(),
		});
		selectedWorkflowIds.value = [];
		toast.showMessage({
			title: i18n.baseText('promotionReview.produce.toast.marked.title'),
			message: i18n.baseText('promotionReview.produce.toast.marked.message', {
				interpolate: { title: result.request.title },
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.produce.toast.marked.error'));
	}
}
</script>

<template>
	<section :class="$style.produce" data-test-id="promotion-review-produce">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="small">
				{{ i18n.baseText('promotionReview.produce.title') }}
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('promotionReview.produce.description') }}
			</N8nText>
		</div>

		<form :class="$style.form" @submit.prevent="onMark">
			<div :class="$style.field">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promotionReview.produce.workflows') }}
				</N8nText>
				<N8nSelect
					v-model="selectedWorkflowIds"
					multiple
					filterable
					size="small"
					:placeholder="i18n.baseText('promotionReview.produce.workflowsPlaceholder')"
					data-test-id="promotion-review-produce-workflows"
				>
					<N8nOption
						v-for="workflow in producibleWorkflows"
						:key="workflow.id"
						:label="workflow.name"
						:value="workflow.id"
					/>
				</N8nSelect>
			</div>
			<div :class="$style.field">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promotionReview.produce.targetEnv') }}
				</N8nText>
				<N8nInput
					v-model="targetEnv"
					size="small"
					:placeholder="i18n.baseText('promotionReview.produce.targetEnvPlaceholder')"
					data-test-id="promotion-review-produce-target-env"
				/>
			</div>
			<N8nButton
				type="primary"
				size="small"
				native-type="submit"
				icon="upload"
				:disabled="!canSubmit"
				:loading="isMarkingForDeployment"
				:label="i18n.baseText('promotionReview.produce.mark')"
				data-test-id="promotion-review-produce-mark"
			/>
		</form>
	</section>
</template>

<style lang="scss" module>
.produce {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--foreground);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
