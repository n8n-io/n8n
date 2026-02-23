<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { DialogRoot, DialogPortal } from 'reka-ui';
import { storeToRefs } from 'pinia';
import { isVNode } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nDialogContent from '@n8n/design-system/components/N8nDialog/DialogContent.vue';
import N8nDialogDescription from '@n8n/design-system/components/N8nDialog/DialogDescription.vue';
import N8nDialogFooter from '@n8n/design-system/components/N8nDialog/DialogFooter.vue';
import N8nDialogHeader from '@n8n/design-system/components/N8nDialog/DialogHeader.vue';
import N8nDialogOverlay from '@n8n/design-system/components/N8nDialog/DialogOverlay.vue';
import N8nDialogTitle from '@n8n/design-system/components/N8nDialog/DialogTitle.vue';
import N8nInput from '@n8n/design-system/components/N8nInput/Input.vue';

import { useAlertDialogStore } from '@/app/stores/alertDialog.store';

const alertDialogStore = useAlertDialogStore();
const {
	isOpen,
	activeType,
	title,
	message,
	actionLabel,
	cancelLabel,
	actionVariant,
	showCancel,
	showCloseButton,
	disableOutsidePointerEvents,
	customClass,
	promptValue,
	promptPlaceholder,
	inputError,
} = storeToRefs(alertDialogStore);

const inputRef = ref<InstanceType<typeof N8nInput> | null>(null);

const isActive = computed(() => isOpen.value && activeType.value === 'prompt');
const isMessageVNode = computed(() => isVNode(message.value));
const messageComponent = computed(() =>
	isMessageVNode.value ? { render: () => message.value } : null,
);
const messageText = computed(() => (typeof message.value === 'string' ? message.value : ''));

const focusInput = async () => {
	await nextTick();
	const element = inputRef.value?.$el?.querySelector('input, textarea');
	if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
		element.focus();
		if (element instanceof HTMLInputElement) {
			element.select();
		}
	}
};

watch(isActive, (value) => {
	if (value) {
		void focusInput();
	}
});

watch(promptValue, () => {
	if (inputError.value) {
		alertDialogStore.clearInputError();
	}
});

const handleOpenChange = (value: boolean) => {
	alertDialogStore.updateOpen(value);
};
</script>

<template>
	<DialogRoot :open="isActive" @update:open="handleOpenChange">
		<DialogPortal>
			<N8nDialogOverlay />
			<N8nDialogContent
				:size="'small'"
				:show-close-button="showCloseButton"
				:disable-outside-pointer-events="disableOutsidePointerEvents"
				:class="[$style.content, 'prompt-dialog', customClass]"
			>
				<N8nDialogHeader>
					<N8nDialogTitle v-html="title" />
					<N8nDialogDescription
						v-if="!isMessageVNode && messageText"
						class="prompt-dialog__description"
						v-html="messageText"
					/>
				</N8nDialogHeader>

				<div class="prompt-dialog__body" :class="$style.body">
					<component v-if="isMessageVNode" :is="messageComponent" />
					<N8nInput
						ref="inputRef"
						v-model="promptValue"
						:placeholder="promptPlaceholder"
						:autofocus="true"
						@keydown.enter="alertDialogStore.confirm"
					/>
					<p v-if="inputError" class="prompt-dialog__error" :class="$style.error">
						{{ inputError }}
					</p>
				</div>

				<N8nDialogFooter class="prompt-dialog__footer" :class="$style.footer">
					<N8nButton
						v-if="showCancel"
						variant="subtle"
						:label="cancelLabel"
						@click="alertDialogStore.cancel"
					/>
					<N8nButton
						:variant="actionVariant === 'destructive' ? 'destructive' : 'solid'"
						:label="actionLabel"
						@click="alertDialogStore.confirm"
					/>
				</N8nDialogFooter>
			</N8nDialogContent>
		</DialogPortal>
	</DialogRoot>
</template>

<style module lang="scss">
.content {
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg) var(--spacing--lg) 0;
}

.error {
	color: var(--color--text--danger);
	font-size: var(--font-size--xs);
}

.footer {
	padding: var(--spacing--lg);
}
</style>
