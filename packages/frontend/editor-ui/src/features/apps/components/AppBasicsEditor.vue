<script setup lang="ts">
import { N8nButton, N8nFormInput, N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, reactive, ref, watch } from 'vue';

import type { Rule, RuleGroup } from '@/Interface';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	app: App;
}>();

const emit = defineEmits<{ saved: [App] }>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

// Mirrors `appNameSchema` / `appNamespaceSchema` in @n8n/api-types: at most
// 128 characters; the namespace is lowercase, digits, single hyphens.
const APP_NAME_MAX_LENGTH = 128;
const NAMESPACE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

const name = ref(props.app.name);
const namespace = ref(props.app.namespace);
const saving = ref(false);
const formValidation = reactive({ name: true, namespace: true });

// The assistant can rename the app mid-session; follow the server's copy.
watch(
	() => props.app,
	(app) => {
		name.value = app.name;
		namespace.value = app.namespace;
	},
);

const isDirty = computed(
	() => name.value !== props.app.name || namespace.value !== props.app.namespace,
);
const canSave = computed(
	() => isDirty.value && formValidation.name && formValidation.namespace && !saving.value,
);

const namespacePreview = computed(() => `/apps/${namespace.value || '…'}`);

const onSave = async () => {
	if (!canSave.value) return;
	saving.value = true;
	try {
		const updated = await appsStore.updateApp(props.projectId, props.app.id, {
			name: name.value,
			namespace: namespace.value,
		});
		emit('saved', updated);
		toast.showMessage({ title: i18n.baseText('apps.builder.basics.saved'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.basics.error'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<div :class="$style.card" data-test-id="app-basics-editor">
		<div :class="$style.header">
			<N8nHeading tag="h2" step="md" color="text-dark">
				{{ i18n.baseText('apps.builder.basics.title') }}
			</N8nHeading>
			<N8nButton
				size="small"
				variant="ghost"
				:loading="saving"
				:disabled="!canSave"
				data-test-id="app-basics-save"
				@click="onSave"
			>
				{{ i18n.baseText('apps.builder.basics.save') }}
			</N8nButton>
		</div>
		<N8nFormInput
			v-model="name"
			:label="i18n.baseText('apps.add.input.name.label')"
			:placeholder="i18n.baseText('apps.add.input.name.placeholder')"
			name="appName"
			required
			:validation-rules="nameValidationRules"
			data-test-id="app-basics-name"
			@validate="(valid: boolean) => (formValidation.name = valid)"
			@enter="onSave"
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
			data-test-id="app-basics-namespace"
			@validate="(valid: boolean) => (formValidation.namespace = valid)"
			@enter="onSave"
		/>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>
