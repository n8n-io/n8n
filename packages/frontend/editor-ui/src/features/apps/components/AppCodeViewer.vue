<script setup lang="ts">
import { N8nText, N8nTree2 } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref, watch } from 'vue';

import { useAppsStore } from '@/features/apps/apps.store';
import { buildFileTree } from '@/features/apps/fileTree.utils';
import FileCodeViewer from '@/features/apps/components/FileCodeViewer.vue';

const props = defineProps<{
	projectId: string;
	appId: string;
	versionId: string | undefined;
}>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const loading = ref(false);
const files = ref<string[]>([]);
const selectedPath = ref<string[]>([]);
const fileContent = ref<string>();

const tree = computed(() => buildFileTree(files.value));

const loadFiles = async () => {
	selectedPath.value = [];
	fileContent.value = undefined;
	if (!props.versionId) {
		files.value = [];
		return;
	}
	loading.value = true;
	try {
		files.value = await appsStore.fetchAppVersionFiles(
			props.projectId,
			props.appId,
			props.versionId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.code.error'));
	} finally {
		loading.value = false;
	}
};

const onSelect = async (selected: string[]) => {
	selectedPath.value = selected;
	const [path] = selected;
	// A directory node is also selectable in the tree; only a leaf is a fetchable file.
	if (!path || !props.versionId || !files.value.includes(path)) return;
	try {
		fileContent.value = await appsStore.fetchAppVersionFileContent(
			props.projectId,
			props.appId,
			props.versionId,
			path,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.code.error'));
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
			<div :class="$style.viewer">
				<FileCodeViewer
					v-if="fileContent !== undefined && selectedPath[0]"
					:path="selectedPath[0]"
					:content="fileContent"
				/>
				<div v-else :class="$style.viewerPlaceholder">
					<N8nText color="text-light">
						{{ i18n.baseText('apps.builder.code.selectFile') }}
					</N8nText>
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

.viewer {
	flex: 1;
	min-width: 0;
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
