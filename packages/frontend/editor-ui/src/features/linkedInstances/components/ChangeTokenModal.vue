<script setup lang="ts">
import type { LinkedInstanceSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nDialog, N8nDialogFooter, N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';

import { useTokenRequest } from '../composables/useTokenRequest';
import { useLinkedInstancesStore } from '../linkedInstances.store';
import { accessTokenError } from '../linkFormValidation';
import LinkFormField from './LinkFormField.vue';

/** Owned by the settings page. The page also restores focus after the dialog closes. */
const props = defineProps<{
	open: boolean;
	instance: LinkedInstanceSummary | undefined;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	updated: [summary: LinkedInstanceSummary];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useLinkedInstancesStore();
const { token, serverError, isSubmitting, send } = useTokenRequest(
	() => props.open,
	() => i18n.baseText('settings.linkedInstances.form.error.unknown'),
);

const touched = ref(false);
const submitAttempted = ref(false);
const tokenField = useTemplateRef<InstanceType<typeof LinkFormField>>('tokenField');

const title = computed(() =>
	i18n.baseText('settings.linkedInstances.token.title', {
		interpolate: { name: props.instance?.name ?? '' },
	}),
);

// Leaving the field empty shows no error. The "required" error waits for a submit.
function onBlur() {
	if (token.value.trim() !== '') touched.value = true;
}

const tokenError = computed(() => {
	const key = accessTokenError(token.value);
	if (key === undefined || !(touched.value || submitAttempted.value)) return undefined;
	return i18n.baseText(key);
});

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		touched.value = false;
		submitAttempted.value = false;
	},
	{ immediate: true },
);

async function submit() {
	const instance = props.instance;
	if (isSubmitting.value || !instance) return;
	submitAttempted.value = true;
	if (accessTokenError(token.value) !== undefined) {
		tokenField.value?.focus();
		return;
	}

	const newToken = token.value.trim();
	const summary = await send(async () => await store.changeToken(instance.id, newToken));
	if (summary) {
		toast.showMessage({
			title: i18n.baseText('settings.linkedInstances.token.updated'),
			type: 'success',
		});
		emit('updated', summary);
		emit('update:open', false);
		return;
	}
	if (serverError.value) {
		// The token was cleared, so ask for it again without an error before the next try.
		submitAttempted.value = false;
		touched.value = false;
		tokenField.value?.focus();
	}
}

// The server check cannot be stopped. The dialog stays open until it ends, so the user sees the result.
function onOpenChange(open: boolean) {
	if (!open && isSubmitting.value) return;
	emit('update:open', open);
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	tokenField.value?.focus();
}

function onCloseAutoFocus(event: Event) {
	event.preventDefault();
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="title"
		:description="i18n.baseText('settings.linkedInstances.token.description')"
		size="medium"
		:show-close-button="!isSubmitting"
		@open-auto-focus="onOpenAutoFocus"
		@close-auto-focus="onCloseAutoFocus"
		@update:open="onOpenChange"
	>
		<form :class="$style.form" novalidate data-test-id="change-token-form" @submit.prevent="submit">
			<LinkFormField
				id="change-token-token"
				ref="tokenField"
				v-model="token"
				type="password"
				:label="i18n.baseText('settings.linkedInstances.form.token.label')"
				:help="i18n.baseText('settings.linkedInstances.form.token.helper')"
				:error="tokenError"
				data-test-id="change-token-input"
				@blur="onBlur"
			/>
			<N8nNotice
				v-if="serverError"
				theme="danger"
				:class="$style.notice"
				data-test-id="change-token-server-error"
			>
				{{ serverError }}
			</N8nNotice>
			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="change-token-cancel"
					@click="onOpenChange(false)"
				/>
				<N8nButton
					type="submit"
					variant="solid"
					:disabled="isSubmitting"
					:label="
						isSubmitting
							? i18n.baseText('settings.linkedInstances.form.checking')
							: i18n.baseText('settings.linkedInstances.token.submit')
					"
					data-test-id="change-token-submit"
				/>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--xs) 0;
}

.notice {
	--notice--margin: 0;
}
</style>
