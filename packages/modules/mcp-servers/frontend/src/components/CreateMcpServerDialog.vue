<script setup lang="ts">
import {
	mcpServerSlugFromName,
	mcpServerSlugInput,
	MCP_SERVER_DESCRIPTION_MAX_LENGTH,
	MCP_SERVER_NAME_MAX_LENGTH,
	MCP_SERVER_SLUG_MAX_LENGTH,
	type McpServerSlugAvailability,
} from '@n8n/api-types';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import {
	capabilities,
	capabilityRegistry,
	componentRegistry,
	type SlotProjectSelection,
} from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useCreateMcpServerDialog } from '../composables/useCreateMcpServerDialog';
import { useMcpServerUrl } from '../composables/useMcpServerUrl';
import { checkMcpServerSlug, createMcpServer } from '../mcp-servers.api';
import { MCP_SERVER_VIEW } from '../mcp-servers.constants';
import { getMcpServerPermissions } from '../mcp-servers.permissions';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const toast = useToast();
const { debounce } = useDebounce();
const latestCheck = useLatestFetch();
const dialog = useCreateMcpServerDialog();
const { serverUrl } = useMcpServerUrl();
const projectPermissions = capabilityRegistry.use(capabilities.projectPermissions);

const ProjectFilter = computed(() => componentRegistry.get('project-filter'));
const nameInput = useTemplateRef<{ focus: () => void }>('nameInput');

const pickedProject = ref<SlotProjectSelection>(null);
const name = ref('');
const slug = ref('');
const slugEdited = ref(false);
const description = ref('');
const availability = ref<McpServerSlugAvailability | null>(null);
const slugCheckFailed = ref(false);
const saving = ref(false);

/** On a project page the project is fixed. On Overview the builder picks it. */
const projectId = computed(() => dialog.state.projectId ?? pickedProject.value?.id);
const canCreateInProject = computed(
	() => projectId.value !== undefined && getMcpServerPermissions(projectId.value).canCreate,
);
const finalSlug = computed(() => mcpServerSlugFromName(slug.value));
const slugError = computed(() => {
	// A name with no Latin letter or digit, such as "日本語", makes no slug.
	if (name.value.trim() !== '' && finalSlug.value === '') {
		return i18n.baseText('mcpServers.create.url.empty');
	}
	if (availability.value?.reason === 'taken') return i18n.baseText('mcpServers.create.url.taken');
	if (availability.value?.reason === 'reserved') {
		return i18n.baseText('mcpServers.create.url.reserved');
	}
	return null;
});
const canSubmit = computed(
	() =>
		name.value.trim() !== '' &&
		canCreateInProject.value &&
		(availability.value?.available === true || slugCheckFailed.value) &&
		!saving.value,
);

watch(
	() => dialog.state.open,
	(open) => {
		if (!open) return;
		pickedProject.value = dialog.state.projectId
			? null
			: { id: projectPermissions.defaultProjectId?.() ?? '' };
		name.value = '';
		slug.value = '';
		slugEdited.value = false;
		description.value = '';
		availability.value = null;
		slugCheckFailed.value = false;
	},
	{ immediate: true },
);

// The dialog state outlives the page. A navigation closes it, so it never creates the server in
// the project of a page that is gone.
watch(
	() => route.fullPath,
	() => {
		if (dialog.state.open) dialog.close();
	},
);

watch(name, (value) => {
	if (!slugEdited.value) slug.value = mcpServerSlugFromName(value);
});

async function onSlugInput(value: string) {
	// The input also echoes a value that the name wrote. Only a different value is an edit.
	if (value === slug.value) return;
	slugEdited.value = true;
	const cleaned = mcpServerSlugInput(value);
	// An unchanged slug does not render again, so the input keeps the dropped characters.
	if (cleaned === slug.value) {
		slug.value = value;
		await nextTick();
	}
	slug.value = cleaned;
}

async function checkSlug() {
	const isLatest = latestCheck.next();
	const value = finalSlug.value;
	const id = projectId.value;
	if (!value || !id || !canCreateInProject.value) return;
	try {
		const result = await checkMcpServerSlug(rootStore.restApiContext, id, value);
		if (isLatest()) availability.value = result;
	} catch {
		// The create call checks the slug again, so Create stays available.
		if (isLatest()) slugCheckFailed.value = true;
	}
}

const checkSlugDebounced = debounce(checkSlug, {
	debounceTime: DEBOUNCE_TIME.INPUT.VALIDATION,
	trailing: true,
});

watch([finalSlug, projectId], async () => {
	latestCheck.invalidate();
	availability.value = null;
	slugCheckFailed.value = false;
	await checkSlugDebounced();
});

// The dialog focuses its first element when it opens, which can be the project picker.
function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	nameInput.value?.focus();
}

async function onCreate() {
	const id = projectId.value;
	if (!canSubmit.value || !id) return;
	saving.value = true;
	try {
		const server = await createMcpServer(rootStore.restApiContext, id, {
			name: name.value.trim(),
			slug: finalSlug.value,
			description: description.value.trim(),
		});
		dialog.close();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.create.success', { interpolate: { name: server.name } }),
		});
		await router.push({
			name: MCP_SERVER_VIEW,
			params: { projectId: server.projectId, serverId: server.id },
		});
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			availability.value = { available: false, reason: 'taken' };
		} else {
			toast.showError(error, i18n.baseText('mcpServers.create.error'));
		}
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="dialog.state.open"
		:header="i18n.baseText('mcpServers.create.title')"
		:aria-description="i18n.baseText('mcpServers.create.ariaDescription')"
		size="medium"
		data-test-id="create-mcp-server-dialog"
		@update:open="(open: boolean) => !open && dialog.close()"
		@open-auto-focus="onOpenAutoFocus"
	>
		<N8nDialogBody :class="$style.form">
			<template v-if="!dialog.state.projectId">
				<N8nInputLabel
					:label="i18n.baseText('mcpServers.create.project')"
					:bold="false"
					size="small"
				>
					<component
						:is="ProjectFilter"
						v-if="ProjectFilter"
						v-model="pickedProject"
						size="medium"
						data-test-id="create-mcp-server-project"
					/>
				</N8nInputLabel>
			</template>
			<N8nText
				v-if="projectId && !canCreateInProject"
				size="small"
				color="danger"
				:class="$style.helper"
				data-test-id="create-mcp-server-project-error"
			>
				{{ i18n.baseText('mcpServers.create.project.noPermission') }}
			</N8nText>
			<N8nText
				v-else-if="!dialog.state.projectId"
				size="small"
				color="text-light"
				:class="$style.helper"
			>
				{{ i18n.baseText('mcpServers.create.project.hint') }}
			</N8nText>

			<N8nInputLabel
				:label="i18n.baseText('mcpServers.create.name')"
				:bold="false"
				size="small"
				input-name="create-mcp-server-name"
				:class="$style.field"
			>
				<N8nInput
					id="create-mcp-server-name"
					ref="nameInput"
					v-model="name"
					:placeholder="i18n.baseText('mcpServers.create.name.placeholder')"
					:maxlength="MCP_SERVER_NAME_MAX_LENGTH"
					data-test-id="create-mcp-server-name"
					@keydown.enter="onCreate"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				:label="i18n.baseText('mcpServers.create.url')"
				:bold="false"
				size="small"
				input-name="create-mcp-server-slug"
				:class="$style.field"
			>
				<N8nInput
					id="create-mcp-server-slug"
					:model-value="slug"
					:placeholder="i18n.baseText('mcpServers.create.url.placeholder')"
					:maxlength="MCP_SERVER_SLUG_MAX_LENGTH"
					data-test-id="create-mcp-server-slug"
					@update:model-value="onSlugInput"
					@keydown.enter="onCreate"
				/>
			</N8nInputLabel>
			<code :class="$style.url" data-test-id="create-mcp-server-url">
				{{ serverUrl(finalSlug || i18n.baseText('mcpServers.create.url.placeholder')) }}
			</code>
			<N8nText
				v-if="slugError"
				size="small"
				color="danger"
				:class="$style.helper"
				data-test-id="create-mcp-server-slug-error"
			>
				{{ slugError }}
			</N8nText>
			<N8nText
				v-else-if="slugCheckFailed"
				size="small"
				color="text-light"
				:class="$style.helper"
				data-test-id="create-mcp-server-slug-unchecked"
			>
				{{ i18n.baseText('mcpServers.create.url.checkFailed') }}
			</N8nText>
			<N8nText v-else size="small" color="text-light" :class="$style.helper">
				{{ i18n.baseText('mcpServers.create.url.hint') }}
			</N8nText>

			<N8nInputLabel
				:label="i18n.baseText('mcpServers.create.descriptionField')"
				:bold="false"
				size="small"
				input-name="create-mcp-server-description"
				:class="$style.field"
			>
				<N8nInput
					id="create-mcp-server-description"
					v-model="description"
					type="textarea"
					:rows="3"
					:maxlength="MCP_SERVER_DESCRIPTION_MAX_LENGTH"
					:placeholder="i18n.baseText('mcpServers.create.descriptionField.placeholder')"
					data-test-id="create-mcp-server-description"
				/>
			</N8nInputLabel>
			<N8nText size="small" color="text-light" :class="$style.helper">
				{{ i18n.baseText('mcpServers.create.descriptionField.hint') }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="ghost" :label="i18n.baseText('generic.cancel')" @click="dialog.close()" />
			<N8nButton
				variant="solid"
				:label="i18n.baseText('mcpServers.create.submit')"
				:disabled="!canSubmit"
				:loading="saving"
				data-test-id="create-mcp-server-submit"
				@click="onCreate"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
}

.field {
	margin-top: var(--spacing--sm);
}

.helper {
	margin-top: var(--spacing--4xs);
}

.url {
	margin-top: var(--spacing--4xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	word-break: break-all;
}
</style>
