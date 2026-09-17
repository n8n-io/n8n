<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, ref, useTemplateRef } from 'vue';

import { promotePackage } from '../promotionsSettings.api';

const props = defineProps<{
	open: boolean;
	connectionId: string;
	baseBranchName: string;
	createBranchOnPromotion: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const commitMessage = ref('');
const isSubmitting = ref(false);
const messageInput = useTemplateRef<InstanceType<typeof N8nInput>>('messageInput');

const isPromoteDisabled = computed(
	() => isSubmitting.value || commitMessage.value.trim().length === 0,
);

const bodyText = computed(() =>
	props.createBranchOnPromotion
		? i18n.baseText('settings.promotions.promote.dialog.body.newBranch')
		: i18n.baseText('settings.promotions.promote.dialog.body.toBranch', {
				interpolate: { branch: props.baseBranchName },
			}),
);

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	void nextTick(() => messageInput.value?.focus());
}

async function submit() {
	if (isPromoteDisabled.value) return;

	isSubmitting.value = true;
	try {
		const result = await promotePackage(rootStore.publicApiContext, props.connectionId, {
			commitMessage: commitMessage.value.trim(),
		});
		toast.showMessage({
			title: i18n.baseText('settings.promotions.promote.toast.success.title'),
			message: i18n.baseText('settings.promotions.promote.toast.success.message', {
				interpolate: {
					branch: result.git.branchName,
					workflows: result.counts.workflows,
					credentials: result.counts.credentials,
				},
			}),
			type: 'success',
		});
		close();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.promote.toast.error'));
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:aria-description="i18n.baseText('settings.promotions.promote.dialog.ariaDescription')"
		data-test-id="promote-instance-dialog"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('settings.promotions.promote.dialog.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<form :class="$style.form" @submit.prevent="submit">
			<N8nText color="text-base">{{ bodyText }}</N8nText>

			<N8nInputLabel
				input-name="promote-commit-message"
				:label="i18n.baseText('settings.promotions.promote.dialog.commitMessage.label')"
				required
			>
				<N8nInput
					id="promote-commit-message"
					ref="messageInput"
					v-model="commitMessage"
					type="textarea"
					:rows="3"
					:disabled="isSubmitting"
					:placeholder="
						i18n.baseText('settings.promotions.promote.dialog.commitMessage.placeholder')
					"
					data-test-id="promote-commit-message"
				/>
			</N8nInputLabel>

			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="promote-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="submit"
					:disabled="isPromoteDisabled"
					:loading="isSubmitting"
					data-test-id="promote-confirm-button"
				>
					{{ i18n.baseText('settings.promotions.promote.dialog.confirm') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
