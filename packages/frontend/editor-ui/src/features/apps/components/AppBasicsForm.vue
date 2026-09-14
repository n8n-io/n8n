<script setup lang="ts">
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { appAuthSchema, appNameSchema, appNamespaceSchema } from '@n8n/api-types';
import { computed, reactive, ref, watch } from 'vue';

import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	appId: string;
	app: App;
}>();

const emit = defineEmits<{
	saved: [app: App];
}>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const form = reactive({
	name: props.app.name,
	namespace: props.app.namespace,
	auth: props.app.auth,
});
const saving = ref(false);

watch(
	() => props.app,
	(app) => {
		form.name = app.name;
		form.namespace = app.namespace;
		form.auth = app.auth;
	},
);

const appUrl = computed(() => `${window.location.origin}/apps/${form.namespace}/`);

const isValid = computed(
	() =>
		appNameSchema.safeParse(form.name).success &&
		appNamespaceSchema.safeParse(form.namespace).success,
);

const isDirty = computed(
	() =>
		form.name !== props.app.name ||
		form.namespace !== props.app.namespace ||
		form.auth !== props.app.auth,
);

const onSave = async () => {
	saving.value = true;
	try {
		const updated = await appsStore.updateApp(props.projectId, props.appId, {
			name: form.name,
			namespace: form.namespace,
			auth: form.auth,
		});
		emit('saved', updated);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.settings.save.error'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<div :class="$style.card" data-test-id="app-basics-form">
		<N8nText tag="h3" size="medium" bold>{{ i18n.baseText('apps.settings.basics') }}</N8nText>
		<N8nInputLabel :label="i18n.baseText('apps.add.input.name.label')" input-name="app-name">
			<N8nInput v-model="form.name" size="medium" data-test-id="app-basics-name" />
		</N8nInputLabel>
		<N8nInputLabel
			:label="i18n.baseText('apps.add.input.namespace.label')"
			input-name="app-namespace"
		>
			<N8nInput v-model="form.namespace" size="medium" data-test-id="app-basics-namespace" />
		</N8nInputLabel>
		<N8nInputLabel :label="i18n.baseText('apps.url.label')" input-name="app-url">
			<N8nText color="text-light" data-test-id="app-basics-url">{{ appUrl }}</N8nText>
		</N8nInputLabel>
		<N8nInputLabel :label="i18n.baseText('apps.auth.label')" input-name="app-auth">
			<N8nSelect v-model="form.auth" size="medium" data-test-id="app-basics-auth">
				<N8nOption
					v-for="option in appAuthSchema.options"
					:key="option"
					:value="option"
					:label="i18n.baseText(`apps.auth.${option}`)"
				/>
			</N8nSelect>
		</N8nInputLabel>
		<div :class="$style.actions">
			<N8nButton
				size="small"
				:loading="saving"
				:disabled="!isValid || !isDirty"
				data-test-id="app-basics-save"
				@click="onSave"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	max-width: 640px;
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.actions {
	display: flex;
	justify-content: flex-end;
}
</style>
