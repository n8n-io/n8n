<script setup lang="ts">
import { N8nButton, N8nText, N8nTree2 } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import type { App } from '@/features/apps/apps.types';
import { useAppsStore } from '@/features/apps/apps.store';
import { buildFileTree } from '@/features/apps/fileTree.utils';
import FileCodeViewer from '@/features/apps/components/FileCodeViewer.vue';

const props = defineProps<{
	projectId: string;
	appId: string;
	versionId: string | undefined;
}>();

const emit = defineEmits<{ saved: [App] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const appsStore = useAppsStore();

const loading = ref(false);
const saving = ref(false);
const files = ref<string[]>([]);
const selectedPath = ref<string[]>([]);
const fileContent = ref<string>();
const editedContent = ref<string>();
const buildError = ref<string>();

const tree = computed(() => buildFileTree(files.value));
const dirty = computed(
	() => editedContent.value !== undefined && editedContent.value !== fileContent.value,
);

const clearSelection = () => {
	selectedPath.value = [];
	fileContent.value = undefined;
	editedContent.value = undefined;
};

const selectFile = async (path: string) => {
	selectedPath.value = [path];
	buildError.value = undefined;
	try {
		const content = await appsStore.fetchAppVersionFileContent(
			props.projectId,
			props.appId,
			props.versionId!,
			path,
		);
		fileContent.value = content;
		editedContent.value = content;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.code.error'));
	}
};

const loadFiles = async () => {
	if (!props.versionId) {
		files.value = [];
		clearSelection();
		return;
	}
	loading.value = true;
	try {
		files.value = await appsStore.fetchAppVersionFiles(
			props.projectId,
			props.appId,
			props.versionId,
		);
		// Re-select the file that was open, so a version change from this tab's
		// own save doesn't reset the view the user was just looking at.
		const current = selectedPath.value[0];
		if (current && files.value.includes(current)) {
			await selectFile(current);
		} else {
			clearSelection();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.code.error'));
	} finally {
		loading.value = false;
	}
};

const onSelect = async (selected: string[]) => {
	const [path] = selected;
	// A directory node is also selectable in the tree; only a leaf is a fetchable file.
	if (!path || !files.value.includes(path) || path === selectedPath.value[0]) return;
	if (dirty.value) {
		const response = await message.confirm(
			i18n.baseText('apps.builder.code.discardChanges.message'),
			i18n.baseText('apps.builder.code.discardChanges.title'),
			{
				confirmButtonText: i18n.baseText('apps.builder.code.discardChanges.confirm'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (response !== MODAL_CONFIRM) return;
	}
	await selectFile(path);
};

const onSave = async () => {
	const path = selectedPath.value[0];
	if (!path || !dirty.value || editedContent.value === undefined || !props.versionId) return;
	saving.value = true;
	buildError.value = undefined;
	try {
		const updated = await appsStore.saveAppVersionFileContent(
			props.projectId,
			props.appId,
			props.versionId,
			path,
			editedContent.value,
		);
		fileContent.value = editedContent.value;
		emit('saved', updated);
		toast.showMessage({ title: i18n.baseText('apps.builder.code.saved'), type: 'success' });
	} catch (error) {
		buildError.value = error instanceof Error ? error.message : String(error);
	} finally {
		saving.value = false;
	}
};

watch(() => props.versionId, loadFiles, { immediate: true });
</script>

<template>
	<div :class="$style.container" data-test-id="app-code-viewer">
		<N8nText v-if="!versionId" color="text-light">
			{{ i18n.baseText('apps.builder.code.empty') }}
		</N8nText>
		<template v-else>
			<div :class="$style.tree">
				<N8nTree2
					:items="tree"
					:model-value="selectedPath"
					data-test-id="app-code-tree"
					@update:model-value="onSelect"
				/>
			</div>
			<div :class="$style.viewerColumn">
				<div v-if="selectedPath[0]" :class="$style.viewerToolbar">
					<N8nText color="text-light" size="small">{{ selectedPath[0] }}</N8nText>
					<N8nButton
						size="small"
						:disabled="!dirty"
						:loading="saving"
						data-test-id="app-code-save"
						@click="onSave"
					>
						{{ i18n.baseText('apps.builder.code.save') }}
					</N8nButton>
				</div>
				<N8nText v-if="buildError" color="danger" size="small" data-test-id="app-code-build-error">
					{{ buildError }}
				</N8nText>
				<div :class="$style.viewer">
					<FileCodeViewer
						v-if="editedContent !== undefined && selectedPath[0]"
						:path="selectedPath[0]"
						:content="editedContent"
						@update:content="editedContent = $event"
					/>
					<div v-else :class="$style.viewerPlaceholder">
						<N8nText color="text-light">
							{{ i18n.baseText('apps.builder.code.selectFile') }}
						</N8nText>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	min-height: 0;
	gap: var(--spacing--sm);
}

.tree {
	flex: 0 0 240px;
	min-width: 0;
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--2xs);
}

.viewerColumn {
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.viewerToolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.viewer {
	flex: 1;
	min-width: 0;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.viewerPlaceholder {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
