<script setup lang="ts">
import {
	appVersionDescriptionSchema,
	appVersionNameSchema,
	type AppPublishPreviewResource,
	type AppResponse,
	type AppVersionResponse,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { getAppPublishPreview, publishApp } from '../../apps.api';
import AppLinkField from './AppLinkField.vue';
import AppPublishResources from './AppPublishResources.vue';
import AppVisibilitySelect from './AppVisibilitySelect.vue';

const NAME_MAX_LENGTH = appVersionNameSchema.maxLength ?? 128;
const DESCRIPTION_MAX_LENGTH = appVersionDescriptionSchema.maxLength ?? 2000;

const props = defineProps<{ app: AppResponse; version: AppVersionResponse }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const rootStore = useRootStore();

const label = ref('');
const description = ref('');
const visibility = ref(props.app.visibility);
const busy = ref(false);
const publishResources = ref(true);
const resources = ref<AppPublishPreviewResource[]>([]);
const loadingResources = ref(false);
const resourcesLoadFailed = ref(false);
const publishError = ref<string | null>(null);

const pendingResources = computed(() =>
	resources.value.filter(({ published, hasChanges }) => !published || hasChanges),
);
const showResources = computed(
	() => publishResources.value && (loadingResources.value || pendingResources.value.length > 0),
);
const canPublish = computed(() => appVersionNameSchema.safeParse(label.value).success);

async function loadResources() {
	const versionId = props.version.id;
	loadingResources.value = true;
	resourcesLoadFailed.value = false;
	try {
		const preview = await getAppPublishPreview(
			rootStore.restApiContext,
			props.app.projectId,
			props.app.id,
			versionId,
		);
		if (versionId === props.version.id) resources.value = preview.resources;
	} catch {
		if (versionId === props.version.id) {
			resources.value = [];
			resourcesLoadFailed.value = true;
		}
	} finally {
		if (versionId === props.version.id) loadingResources.value = false;
	}
}

function reset() {
	label.value = props.version.label ?? props.app.name;
	description.value = props.version.description ?? '';
	visibility.value = props.app.visibility;
	publishResources.value = true;
	publishError.value = null;
	resources.value = [];
	void loadResources();
}

async function publish() {
	busy.value = true;
	publishError.value = null;
	try {
		emit(
			'updated',
			await publishApp(rootStore.restApiContext, props.app.projectId, props.app.id, {
				versionId: props.version.id,
				label: label.value,
				description: description.value,
				visibility: visibility.value === props.app.visibility ? undefined : visibility.value,
				publishResources: publishResources.value,
			}),
		);
		open.value = false;
	} catch (error) {
		publishError.value =
			error instanceof Error && error.message ? error.message : i18n.baseText('apps.publish.error');
		void loadResources();
	} finally {
		busy.value = false;
	}
}

watch(open, (isOpen) => isOpen && reset(), { immediate: true });
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="i18n.baseText('apps.publish.dialog.title')"
		data-test-id="app-publish-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nInputLabel
				:label="i18n.baseText('apps.publish.dialog.name')"
				input-name="app-publish-name"
				required
				size="small"
				color="text-dark"
			>
				<N8nInput
					id="app-publish-name"
					v-model="label"
					:maxlength="NAME_MAX_LENGTH"
					:disabled="busy"
					data-test-id="app-publish-name"
				/>
				<N8nText :class="$style.counter" size="xsmall" color="text-light">
					{{ label.length }}/{{ NAME_MAX_LENGTH }}
				</N8nText>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('apps.publish.dialog.description')"
				input-name="app-publish-description"
				size="small"
				color="text-dark"
			>
				<N8nInput
					id="app-publish-description"
					v-model="description"
					type="textarea"
					:rows="4"
					:maxlength="DESCRIPTION_MAX_LENGTH"
					:disabled="busy"
					data-test-id="app-publish-description"
				/>
			</N8nInputLabel>
			<AppLinkField v-if="app.publishedUrl" :url="app.publishedUrl" />
			<AppVisibilitySelect v-model="visibility" :disabled="busy" />
			<N8nCheckbox
				v-model="publishResources"
				:label="i18n.baseText('apps.publish.dialog.publishResources')"
				:disabled="busy"
				data-test-id="app-publish-resources"
			/>
			<AppPublishResources
				v-if="showResources"
				:resources="pendingResources"
				:project-id="app.projectId"
				:loading="loadingResources"
			/>
			<N8nCallout
				v-if="resourcesLoadFailed && publishResources"
				theme="warning"
				data-test-id="app-publish-resources-error"
			>
				{{ i18n.baseText('apps.publish.dialog.resources.loadError') }}
			</N8nCallout>
			<N8nCallout v-if="publishError" theme="danger" data-test-id="app-publish-error">
				{{ publishError }}
			</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="busy"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('apps.publish.publish')"
				:loading="busy"
				:disabled="!canPublish"
				data-test-id="app-publish-dialog-confirm"
				@click="publish"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.counter {
	display: block;
	margin-top: var(--spacing--4xs);
	text-align: right;
}
</style>
