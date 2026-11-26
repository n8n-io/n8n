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
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getProject, type Project } from '@n8n/rest-api-client/api/projects';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { getAppPublishPreview, publishApp } from '../../apps.api';
import AppLinkField from './AppLinkField.vue';
import AppPublishConnections from './AppPublishConnections.vue';

const NAME_MAX_LENGTH = appVersionNameSchema.maxLength ?? 128;
const DESCRIPTION_MAX_LENGTH = appVersionDescriptionSchema.maxLength ?? 2000;
// Marks where the bold project name goes, so the translated sentence keeps its own word order.
const PROJECT_MARKER = '\u0000';

const props = defineProps<{ app: AppResponse; version: AppVersionResponse }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const rootStore = useRootStore();

const label = ref('');
const description = ref('');
const project = ref<Project | null>(null);
const busy = ref(false);
const resources = ref<AppPublishPreviewResource[]>([]);
const resourcesLoadFailed = ref(false);
const publishError = ref<string | null>(null);

// Only connections that were never published go live with the app.
const unpublished = computed(() => resources.value.filter(({ published }) => !published));
const toPublish = computed(() => unpublished.value.filter(({ canPublish }) => canPublish));
const skipped = computed(() => unpublished.value.filter(({ canPublish }) => !canPublish));
// Apps from before project-only access can still be open to the whole instance.
const availability = computed(() => {
	if (props.app.visibility === 'instance') {
		return { before: i18n.baseText('apps.publish.dialog.availability.instance') };
	}
	if (!project.value) {
		return { before: i18n.baseText('apps.publish.dialog.availability.projectFallback') };
	}
	const name =
		project.value.type === 'personal'
			? i18n.baseText('projects.menu.personal')
			: (project.value.name ?? '');
	const [before = '', after = ''] = i18n
		.baseText('apps.publish.dialog.availability.project', {
			interpolate: { projectName: PROJECT_MARKER },
		})
		.split(PROJECT_MARKER);
	return { before, name, after };
});
const canPublish = computed(() => appVersionNameSchema.safeParse(label.value).success);

let latestLoad = 0;

async function loadResources() {
	const load = ++latestLoad;
	const versionId = props.version.id;
	resourcesLoadFailed.value = false;
	try {
		const preview = await getAppPublishPreview(
			rootStore.restApiContext,
			props.app.projectId,
			props.app.id,
			versionId,
		);
		if (load === latestLoad) resources.value = preview.resources;
	} catch {
		if (load === latestLoad) {
			resources.value = [];
			resourcesLoadFailed.value = true;
		}
	}
}

async function loadProject() {
	try {
		project.value = await getProject(rootStore.restApiContext, props.app.projectId);
	} catch {
		project.value = null;
	}
}

function reset() {
	label.value = props.version.label ?? props.app.name;
	description.value = props.version.description ?? '';
	publishError.value = null;
	resources.value = [];
	void loadResources();
	if (project.value?.id !== props.app.projectId) void loadProject();
}

async function publish() {
	busy.value = true;
	try {
		emit(
			'updated',
			await publishApp(rootStore.restApiContext, props.app.projectId, props.app.id, {
				versionId: props.version.id,
				label: label.value,
				description: description.value,
				publishResources: true,
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
			<AppPublishConnections
				v-if="toPublish.length > 0"
				theme="info"
				:message="i18n.baseText('apps.publish.dialog.connections.publish')"
				:resources="toPublish"
				data-test-id="app-publish-connections"
			/>
			<AppPublishConnections
				v-if="skipped.length > 0"
				theme="warning"
				:message="i18n.baseText('apps.publish.dialog.connections.skipped')"
				:resources="skipped"
				data-test-id="app-publish-connections-skipped"
			/>
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
			<N8nCallout
				v-if="resourcesLoadFailed"
				theme="warning"
				data-test-id="app-publish-resources-error"
			>
				{{ i18n.baseText('apps.publish.dialog.resources.loadError') }}
			</N8nCallout>
			<N8nText
				tag="p"
				size="small"
				:class="$style.availability"
				data-test-id="app-publish-availability"
			>
				<N8nIcon icon="info" :size="12" :class="$style.availabilityIcon" />
				<span>
					{{ availability.before
					}}<strong v-if="availability.name" :class="$style.projectName">{{
						availability.name
					}}</strong
					>{{ availability.after }}
				</span>
			</N8nText>
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

.availability {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	/* Adds to the body gap, so the line sits apart from the fields above. */
	margin-top: var(--spacing--sm);
	color: var(--text-color);
}

.availabilityIcon {
	flex-shrink: 0;
}

.projectName {
	font-weight: var(--font-weight--bold);
}

.counter {
	display: block;
	margin-top: var(--spacing--4xs);
	text-align: right;
}
</style>
