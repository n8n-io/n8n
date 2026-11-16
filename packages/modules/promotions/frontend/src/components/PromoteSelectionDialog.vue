<script setup lang="ts">
import type { PromotionProviderType } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, useTemplateRef } from 'vue';

import PromotionCommitMessageField from './PromotionCommitMessageField.vue';

const props = defineProps<{
	open: boolean;
	changeCount: number;
	baseBranchName: string;
	createBranchOnPromotion: boolean;
	providerType: PromotionProviderType;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	/** `undefined` lets the backend generate the message. */
	confirm: [commitMessage: string | undefined];
}>();

// Owned by the parent, so the typed message survives a failed promote.
const commitMessage = defineModel<string>('commitMessage', { default: '' });

const i18n = useI18n();
const messageField = useTemplateRef('messageField');

const title = computed(() =>
	i18n.baseText('promotions.preview.promote.dialog.title', {
		adjustToNumber: props.changeCount,
		interpolate: { count: String(props.changeCount) },
	}),
);

const bodyText = computed(() => {
	if (props.providerType === 'gitlab' && props.createBranchOnPromotion) {
		return i18n.baseText('promotions.preview.promote.dialog.body.mergeRequest', {
			interpolate: { branch: props.baseBranchName },
		});
	}
	return props.createBranchOnPromotion
		? i18n.baseText('promotions.preview.promote.dialog.body.newBranch')
		: i18n.baseText('promotions.preview.promote.dialog.body.toBranch', {
				interpolate: { branch: props.baseBranchName },
			});
});

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	void nextTick(() => messageField.value?.focus());
}

function submit() {
	emit('confirm', commitMessage.value.trim() || undefined);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:aria-description="bodyText"
		data-test-id="promote-selection-dialog"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<form id="promote-selection-form" :class="$style.body" @submit.prevent="submit">
				<N8nText color="text-base">{{ bodyText }}</N8nText>
				<PromotionCommitMessageField ref="messageField" v-model="commitMessage" />
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="promote-cancel-button"
				@click="emit('update:open', false)"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton type="submit" form="promote-selection-form" data-test-id="promote-confirm-button">
				{{ i18n.baseText('promotions.preview.promote.dialog.confirm') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
