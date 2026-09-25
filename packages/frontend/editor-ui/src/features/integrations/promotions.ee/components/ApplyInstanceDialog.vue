<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, shallowRef } from 'vue';

import { applyPromotion } from '../promotionsSettings.api';
import PromotionBindingsFlow from './PromotionBindingsFlow.vue';
import type { AppliedResult, BlockedApplyResult } from '../promotions.types';

const props = defineProps<{
	open: boolean;
	connectionId: string;
	branchName: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const isSubmitting = ref(false);
const blockedResult = shallowRef<BlockedApplyResult>();

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function reportApplied(result: AppliedResult) {
	const { workflows } = result.counts;
	toast.showMessage({
		title: i18n.baseText('settings.promotions.apply.toast.success.title'),
		message: i18n.baseText('settings.promotions.apply.toast.success.message', {
			interpolate: {
				created: String(workflows.created),
				updated: String(workflows.updated),
				archived: String(workflows.archived),
				deleted: String(workflows.deleted),
			},
		}),
		type: 'success',
	});
}

function reportSourceChanged() {
	toast.showMessage({
		title: i18n.baseText('settings.promotions.apply.toast.sourceChanged.title'),
		message: i18n.baseText('settings.promotions.apply.toast.sourceChanged.message'),
		type: 'warning',
	});
}

async function submit() {
	if (isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		// Whole-branch apply: no expectedSource, so the current branch tip is applied.
		const result = await applyPromotion(rootStore.publicApiContext, props.connectionId);
		if (result.status === 'applied') {
			reportApplied(result);
			close();
			return;
		}
		if (result.status === 'blocked') {
			// Hand off to the binding flow, which resumes the same whole-branch apply.
			blockedResult.value = result;
			return;
		}
		reportSourceChanged();
		close();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.apply.toast.error'));
	} finally {
		isSubmitting.value = false;
	}
}

function onBindingsApplied(result: AppliedResult) {
	blockedResult.value = undefined;
	reportApplied(result);
	close();
}

function onBindingsSourceChanged() {
	blockedResult.value = undefined;
	reportSourceChanged();
	close();
}

function onBindingsOpenChange(open: boolean) {
	if (open) return;
	blockedResult.value = undefined;
	close();
}
</script>

<template>
	<N8nDialog
		v-if="!blockedResult"
		:open="open"
		size="medium"
		:aria-description="
			i18n.baseText('settings.promotions.apply.dialog.ariaDescription', {
				interpolate: { branch: branchName },
			})
		"
		data-test-id="apply-instance-dialog"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('settings.promotions.apply.dialog.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<form :class="$style.form" @submit.prevent="submit">
			<N8nText color="text-base">
				{{
					i18n.baseText('settings.promotions.apply.dialog.body', {
						interpolate: { branch: branchName },
					})
				}}
			</N8nText>

			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="apply-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="submit" :loading="isSubmitting" data-test-id="apply-confirm-button">
					{{ i18n.baseText('settings.promotions.apply.dialog.confirm') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
	<PromotionBindingsFlow
		v-else
		:open="true"
		:blocked-result="blockedResult"
		@applied="onBindingsApplied"
		@source-changed="onBindingsSourceChanged"
		@update:open="onBindingsOpenChange"
	/>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
