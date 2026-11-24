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

import type { PromotionOutsideAccessDependency } from '../promotions.types';
import PromotionCommitMessageField from './PromotionCommitMessageField.vue';
import PromotionUnresolvedSummary from './PromotionUnresolvedSummary.vue';

const props = withDefaults(
	defineProps<{
		open: boolean;
		changeCount: number;
		baseBranchName: string;
		createBranchOnPromotion: boolean;
		providerType: PromotionProviderType;
		/** What the Promote leaves out. The dialog then says so, in place of a second dialog. */
		unresolved?: PromotionOutsideAccessDependency[];
	}>(),
	{ unresolved: () => [] },
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	/** `undefined` lets the backend generate the message. */
	confirm: [commitMessage: string | undefined];
}>();

// Owned by the parent, so the typed message survives a failed promote.
const commitMessage = defineModel<string>('commitMessage', { default: '' });

const i18n = useI18n();
const messageField = useTemplateRef('messageField');

const hasUnresolved = computed(() => props.unresolved.length > 0);

// The title stays the same with or without unresolved dependencies, so it matches the button.
const title = computed(() =>
	i18n.baseText('promotions.preview.promote.dialog.title', {
		adjustToNumber: props.changeCount,
		interpolate: { count: String(props.changeCount) },
	}),
);

// The button repeats the label of the button that opened the dialog, so no new word appears
// at the moment of the decision.
const confirmLabel = computed(() =>
	hasUnresolved.value
		? i18n.baseText('promotions.preview.submit.promote', {
				adjustToNumber: props.changeCount,
				interpolate: { count: String(props.changeCount) },
			})
		: i18n.baseText('promotions.preview.promote.dialog.confirm'),
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
			<form
				id="promote-selection-form"
				:class="[$style.body, hasUnresolved && $style.withUnresolved]"
				@submit.prevent="submit"
			>
				<PromotionUnresolvedSummary
					v-if="hasUnresolved"
					:dependencies="unresolved"
					direction="promote"
				/>
				<N8nText v-else color="text-base">{{ bodyText }}</N8nText>
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
				{{ confirmLabel }}
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

// The list of dependencies and the commit message are two tasks, so they get more room.
.withUnresolved {
	gap: var(--spacing--lg);
}
</style>
