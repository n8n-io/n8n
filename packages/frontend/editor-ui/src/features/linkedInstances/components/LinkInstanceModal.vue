<script setup lang="ts">
import type { LinkedInstanceSummary } from '@n8n/api-types';
import { N8nButton, N8nDialog, N8nDialogFooter, N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, reactive, ref, useTemplateRef, watch } from 'vue';

import { useTokenRequest } from '../composables/useTokenRequest';
import { useLinkedInstancesStore } from '../linkedInstances.store';
import { validateLinkForm, type LinkFormField as Field } from '../linkFormValidation';
import LinkFormField from './LinkFormField.vue';
import StableButtonLabel from './StableButtonLabel.vue';

/** Owned by the settings page. The page also restores focus after the dialog closes. */
const props = defineProps<{ open: boolean }>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	linked: [summary: LinkedInstanceSummary];
	/** The dialog has left the page. */
	closed: [];
}>();

const FIELDS: readonly Field[] = ['name', 'url', 'token'];

const i18n = useI18n();
const store = useLinkedInstancesStore();
const { token, serverError, isSubmitting, send } = useTokenRequest(
	() => props.open,
	() => i18n.baseText('settings.linkedInstances.form.error.unknown'),
);

const name = ref('');
const url = ref('');
const touched = reactive<Record<Field, boolean>>({ name: false, url: false, token: false });
const submitAttempted = ref(false);

const fields = {
	name: useTemplateRef<InstanceType<typeof LinkFormField>>('nameField'),
	url: useTemplateRef<InstanceType<typeof LinkFormField>>('urlField'),
	token: useTemplateRef<InstanceType<typeof LinkFormField>>('tokenField'),
};

// Both texts of the submit button. The longer one sets the width, so "Cancel" does not move.
const submitLabels = computed(() => [
	i18n.baseText('settings.linkedInstances.form.submit'),
	i18n.baseText('settings.linkedInstances.form.checking'),
]);

const values = computed(() => ({ name: name.value, url: url.value, token: token.value }));
const errors = computed(() => validateLinkForm(values.value));

// Leaving an empty field shows no error, so a user can move through the form freely.
// The "required" errors wait for a submit.
function onBlur(field: Field) {
	if (values.value[field].trim() !== '') touched[field] = true;
}

// An error shows after the user leaves the field or tries to submit, not while they type.
function errorFor(field: Field): string | undefined {
	const key = errors.value[field];
	if (key === undefined || !(touched[field] || submitAttempted.value)) return undefined;
	return i18n.baseText(key);
}

function resetForm() {
	name.value = '';
	url.value = '';
	for (const field of FIELDS) touched[field] = false;
	submitAttempted.value = false;
}

watch(
	() => props.open,
	(open) => {
		if (open) resetForm();
	},
	{ immediate: true },
);

async function submit() {
	if (isSubmitting.value) return;
	submitAttempted.value = true;
	const invalid = FIELDS.find((field) => errors.value[field] !== undefined);
	if (invalid) {
		fields[invalid].value?.focus();
		return;
	}

	const payload = { name: name.value.trim(), url: url.value.trim(), token: token.value.trim() };
	const summary = await send(async () => await store.link(payload));
	if (summary) {
		emit('linked', summary);
		emit('update:open', false);
		return;
	}
	if (serverError.value) {
		// The name and the address stay. The token was cleared, so ask for it again.
		submitAttempted.value = false;
		touched.token = false;
		fields.token.value?.focus();
	}
}

// The server check cannot be stopped. The dialog stays open until it ends, so the user sees the result.
function onOpenChange(open: boolean) {
	if (!open && isSubmitting.value) return;
	emit('update:open', open);
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	fields.name.value?.focus();
}

// The page stays hidden from screen readers until the dialog has left it, which ends after this
// event. So the page moves focus and makes announcements on "closed", one task later.
function onCloseAutoFocus(event: Event) {
	event.preventDefault();
	setTimeout(() => emit('closed'), 0);
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="i18n.baseText('settings.linkedInstances.form.title')"
		:description="i18n.baseText('settings.linkedInstances.form.description')"
		size="medium"
		:show-close-button="!isSubmitting"
		@open-auto-focus="onOpenAutoFocus"
		@close-auto-focus="onCloseAutoFocus"
		@update:open="onOpenChange"
	>
		<form
			:class="$style.form"
			novalidate
			data-test-id="link-instance-form"
			@submit.prevent="submit"
		>
			<LinkFormField
				id="link-instance-name"
				ref="nameField"
				v-model="name"
				:label="i18n.baseText('settings.linkedInstances.form.name.label')"
				:placeholder="i18n.baseText('settings.linkedInstances.form.name.placeholder')"
				:error="errorFor('name')"
				data-test-id="link-instance-name-input"
				@blur="onBlur('name')"
			/>
			<LinkFormField
				id="link-instance-url"
				ref="urlField"
				v-model="url"
				:label="i18n.baseText('settings.linkedInstances.form.url.label')"
				:placeholder="i18n.baseText('settings.linkedInstances.form.url.placeholder')"
				:error="errorFor('url')"
				data-test-id="link-instance-url-input"
				@blur="onBlur('url')"
			/>
			<LinkFormField
				id="link-instance-token"
				ref="tokenField"
				v-model="token"
				type="password"
				:label="i18n.baseText('settings.linkedInstances.form.token.label')"
				:help="i18n.baseText('settings.linkedInstances.form.token.helper')"
				:error="errorFor('token')"
				data-test-id="link-instance-token-input"
				@blur="onBlur('token')"
			/>
			<N8nNotice
				v-if="serverError"
				theme="danger"
				:class="$style.notice"
				data-test-id="link-instance-server-error"
			>
				{{ serverError }}
			</N8nNotice>
			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="link-instance-cancel"
					@click="onOpenChange(false)"
				/>
				<N8nButton
					type="submit"
					variant="solid"
					:disabled="isSubmitting"
					data-test-id="link-instance-submit"
				>
					<StableButtonLabel
						:label="
							isSubmitting
								? i18n.baseText('settings.linkedInstances.form.checking')
								: i18n.baseText('settings.linkedInstances.form.submit')
						"
						:labels="submitLabels"
					/>
				</N8nButton>
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
