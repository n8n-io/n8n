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
	/** Bumped when the draft may have changed elsewhere (a turn ended); reloads the file list. */
	refreshKey?: number;
}>();

const emit = defineEmits<{ saved: [App] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const appsStore = useAppsStore();

const loading = ref(false);
const saving = ref(false);
/** The stored version the listed files come from; undefined while the app has no source. */
const versionId = ref<string>();
const files = ref<string[]>([]);
const selectedPath = ref<string[]>([]);
const fileContent = ref<string>();
const editedContent = ref<string>();
const saveError = ref<string>();

const tree = computed(() => buildFileTree(files.value));
const dirty = computed(
	() => editedContent.value !== undefined && editedContent.value !== fileContent.value,
);
// Only worth calling out before the first list has ever loaded — once files
// are showing, a background refresh shouldn't yank them away for a spinner.
const showTreeLoading = computed(() => loading.value && files.value.length === 0);

const clearSelection = () => {
	selectedPath.value = [];
	fileContent.value = undefined;
	editedContent.value = undefined;
};

// Guards against an older fetch resolving after a newer one (e.g. clicking a
// second file before the first one's content arrives).
let selectRequestId = 0;

const selectFile = async (path: string) => {
	const requestId = ++selectRequestId;
	saveError.value = undefined;
	if (!versionId.value) return;
	try {
		const content = await appsStore.fetchAppVersionFileContent(
			props.projectId,
			props.appId,
			versionId.value,
			path,
		);
		if (requestId !== selectRequestId) return;
		// `selectedPath` (the viewer's `path`) and `fileContent`/`editedContent`
		// (its `content`) must land in the same tick — the viewer only recreates
		// on a `path` change, so a `path` update with stale content would show
		// the previous file's text under the new file's name until the next click.
		selectedPath.value = [path];
		fileContent.value = content;
		editedContent.value = content;
	} catch (error) {
		if (requestId === selectRequestId) {
			toast.showError(error, i18n.baseText('apps.builder.code.error'));
		}
	}
};

// Guards against an older list request resolving after a newer one (e.g. two
// rapid refreshes), the same way `selectRequestId` guards file fetches.
let loadRequestId = 0;

const loadFiles = async () => {
	const requestId = ++loadRequestId;
	loading.value = true;
	try {
		const draft = await appsStore.fetchAppDraftFiles(props.projectId, props.appId);
		if (requestId !== loadRequestId) return;
		versionId.value = draft?.versionId;
		files.value = draft?.files ?? [];
		// Re-select the file that was open, so a refresh doesn't reset the view
		// the user was just looking at — unless it has unsaved edits, which a
		// reload would silently discard.
		const current = selectedPath.value[0];
		if (current && files.value.includes(current)) {
			if (!dirty.value) await selectFile(current);
		} else {
			clearSelection();
		}
	} catch (error) {
		if (requestId !== loadRequestId) return;
		// A stale/broken list shouldn't stay on screen looking editable.
		versionId.value = undefined;
		files.value = [];
		clearSelection();
		toast.showError(error, i18n.baseText('apps.builder.code.error'));
	} finally {
		if (requestId === loadRequestId) loading.value = false;
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
	if (!path || !dirty.value || editedContent.value === undefined) return;
	// Snapshot everything the request needs and identifies: `props.appId`, the
	// selection, and the buffer can all change while this request is in
	// flight (switching apps/files, or just continuing to type), and neither
	// the request nor its result should follow those later changes.
	const requestAppId = props.appId;
	const contentToSave = editedContent.value;
	const stillOnSameSelection = () => props.appId === requestAppId && selectedPath.value[0] === path;
	saving.value = true;
	saveError.value = undefined;
	try {
		const updated = await appsStore.saveAppDraftFile(
			props.projectId,
			requestAppId,
			path,
			contentToSave,
		);
		if (props.appId === requestAppId) {
			emit('saved', updated);
			toast.showMessage({ title: i18n.baseText('apps.builder.code.saved'), type: 'success' });
		}
		// Only mark the buffer clean if it's still the file this save was for —
		// otherwise a since-switched file's `fileContent` would be corrupted
		// with this file's saved text.
		if (stillOnSameSelection()) fileContent.value = contentToSave;
	} catch (error) {
		if (stillOnSameSelection()) {
			saveError.value = error instanceof Error ? error.message : String(error);
		}
	} finally {
		saving.value = false;
	}
};

// Reused route component instance across an app switch: `appId` updates
// synchronously, well before the parent's async re-fetch replaces `app` —
// clear the buffer immediately so a save can't fire in that gap with the
// previous app's content under the new app's id.
watch(
	() => props.appId,
	() => {
		versionId.value = undefined;
		files.value = [];
		clearSelection();
	},
);

watch([() => props.appId, () => props.refreshKey], loadFiles, {
	immediate: true,
});
</script>

<template>
	<div :class="$style.container" data-test-id="app-code-viewer">
		<N8nText v-if="!versionId && !loading" color="text-light">
			{{ i18n.baseText('apps.builder.code.empty') }}
		</N8nText>
		<template v-else>
			<div :class="$style.tree">
				<N8nText v-if="showTreeLoading" color="text-light" data-test-id="app-code-tree-loading">
					{{ i18n.baseText('apps.builder.code.loading') }}
				</N8nText>
				<N8nTree2
					v-else
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
				<N8nText v-if="saveError" color="danger" size="small" data-test-id="app-code-save-error">
					{{ saveError }}
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
	width: 100%;
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
