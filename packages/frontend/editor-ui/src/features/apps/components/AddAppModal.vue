<script setup lang="ts">
import { N8nButton, N8nFormInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import Modal from '@/app/components/Modal.vue';
import type { Rule, RuleGroup } from '@/Interface';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_DETAILS } from '@/features/apps/apps.constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceAiReady } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

type AddAppModalData = { projectId: string };

const props = defineProps<{
	modalName: string;
	data: AddAppModalData;
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const appsStore = useAppsStore();
const instanceAiReady = useInstanceAiReady();
const { createAppArtifactThread } = useInstanceAiHandoff();

// Mirrors `appNameSchema` / `appNamespaceSchema` in @n8n/api-types: at most
// 128 characters; the namespace is lowercase, digits, single hyphens.
const APP_NAME_MAX_LENGTH = 128;
const NAMESPACE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const toNamespace = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const nameValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: APP_NAME_MAX_LENGTH } },
];
const namespaceValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: APP_NAME_MAX_LENGTH } },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: NAMESPACE_REGEX,
			message: i18n.baseText('apps.add.input.namespace.error.regex'),
		},
	},
];

const name = ref('');
// Follows the name until the user types into the namespace field.
const editedNamespace = ref<string | null>(null);
const namespace = computed({
	get: () => editedNamespace.value ?? toNamespace(name.value),
	set: (value: string) => {
		editedNamespace.value = value;
	},
});
const isCreating = ref(false);
const formValidation = reactive({ name: false, namespace: false });
const isFormValid = computed(() => formValidation.name && formValidation.namespace);

const namespacePreview = computed(() => `/apps/${namespace.value || '…'}`);

// The app page opens the thread bound to the new app; the agent fills the app's
// sandbox from there and never creates the app itself.
const onSubmit = async () => {
	if (!isFormValid.value || isCreating.value) return;
	isCreating.value = true;
	try {
		const app = await appsStore.createApp(props.data.projectId, name.value, namespace.value);
		const threadId = instanceAiReady.value
			? await createAppArtifactThread(
					{
						type: 'app',
						appId: app.id,
						projectId: props.data.projectId,
						name: name.value,
						namespace: namespace.value,
					},
					{
						source: 'app_builder_page',
						origin: 'internal',
						sourceContext: { namespace: namespace.value },
					},
				)
			: undefined;
		uiStore.closeModal(props.modalName);
		await router.push({
			name: APP_DETAILS,
			params: { projectId: props.data.projectId, appId: app.id },
			...(threadId ? { query: { thread: threadId } } : {}),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.add.error'));
	} finally {
		isCreating.value = false;
	}
};
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="480px" data-test-id="add-app-modal">
		<template #header>
			<h2>{{ i18n.baseText('apps.add.title') }}</h2>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nFormInput
					v-model="name"
					:label="i18n.baseText('apps.add.input.name.label')"
					:placeholder="i18n.baseText('apps.add.input.name.placeholder')"
					name="appName"
					required
					focus-initially
					:validation-rules="nameValidationRules"
					data-test-id="apps-new-name"
					@validate="(valid: boolean) => (formValidation.name = valid)"
					@enter="onSubmit"
				/>
				<N8nFormInput
					v-model="namespace"
					:label="i18n.baseText('apps.add.input.namespace.label')"
					:placeholder="i18n.baseText('apps.add.input.namespace.placeholder')"
					:info-text="
						i18n.baseText('apps.add.input.namespace.hint', {
							interpolate: { path: namespacePreview },
						})
					"
					name="appNamespace"
					required
					:validation-rules="namespaceValidationRules"
					data-test-id="apps-new-namespace"
					@validate="(valid: boolean) => (formValidation.namespace = valid)"
					@enter="onSubmit"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="apps-new-cancel"
					@click="uiStore.closeModal(props.modalName)"
				/>
				<N8nButton
					:loading="isCreating"
					:disabled="!isFormValid"
					size="large"
					:label="i18n.baseText('apps.add.button.label')"
					data-test-id="apps-new-submit"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}
</style>
