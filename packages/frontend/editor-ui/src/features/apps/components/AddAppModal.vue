<script setup lang="ts">
import { N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import Modal from '@/app/components/Modal.vue';
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
const { openAppArtifactThread } = useInstanceAiHandoff();

// Mirrors `appNamespaceSchema` in @n8n/api-types: lowercase, digits, single hyphens.
const toNamespace = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

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
const nameInputRef = ref<HTMLInputElement | null>(null);

const namespacePreview = computed(() => `/apps/${namespace.value || '…'}`);

// With the assistant ready, the agent creates the row itself from the handed-off
// name and namespace (`apps.create`), so the thread owns the app from the start.
const onSubmit = async () => {
	if (!name.value || !namespace.value || isCreating.value) return;
	isCreating.value = true;
	try {
		if (instanceAiReady.value) {
			const opened = await openAppArtifactThread(
				{
					type: 'app',
					projectId: props.data.projectId,
					name: name.value,
					namespace: namespace.value,
					isNewApp: true,
				},
				{
					source: 'app_builder_page',
					origin: 'internal',
					sourceContext: { namespace: namespace.value },
				},
			);
			if (opened) uiStore.closeModal(props.modalName);
			return;
		}
		const app = await appsStore.createApp(props.data.projectId, name.value, namespace.value);
		uiStore.closeModal(props.modalName);
		await router.push({
			name: APP_DETAILS,
			params: { projectId: props.data.projectId, appId: app.id },
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.add.error'));
	} finally {
		isCreating.value = false;
	}
};

onMounted(() => {
	setTimeout(() => nameInputRef.value?.focus(), 0);
});
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="480px" data-test-id="add-app-modal">
		<template #header>
			<h2>{{ i18n.baseText('apps.add.title') }}</h2>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nInputLabel
					:label="i18n.baseText('apps.add.input.name.label')"
					:required="true"
					input-name="appName"
				>
					<N8nInput
						ref="nameInputRef"
						v-model="name"
						:placeholder="i18n.baseText('apps.add.input.name.placeholder')"
						name="appName"
						data-test-id="apps-new-name"
						@keydown.enter="onSubmit"
					/>
				</N8nInputLabel>
				<div :class="$style.field">
					<N8nInputLabel
						:label="i18n.baseText('apps.add.input.namespace.label')"
						:required="true"
						input-name="appNamespace"
					>
						<N8nInput
							v-model="namespace"
							:placeholder="i18n.baseText('apps.add.input.namespace.placeholder')"
							name="appNamespace"
							data-test-id="apps-new-namespace"
							@keydown.enter="onSubmit"
						/>
					</N8nInputLabel>
					<N8nText color="text-light" size="small">
						{{
							i18n.baseText('apps.add.input.namespace.hint', {
								interpolate: { path: namespacePreview },
							})
						}}
					</N8nText>
				</div>
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
					:disabled="!name || !namespace"
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

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}
</style>
