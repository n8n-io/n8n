<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nInput, N8nSelect, N8nOption, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { folderNameSchema } from '@n8n/api-types';
import { PROJECT_ROOT } from 'n8n-workflow';
import {
	createFolder,
	deleteFolder,
	getFolderContent,
	getProjectFolders,
	moveFolder,
	renameFolder,
} from '@/features/core/folders/folders.api';
import { invalidateProjectAgentsListCache } from '../composables/useProjectAgentsList';
import { moveAgent } from '../composables/useAgentApi';
import AgentModal from './modals/AgentModal.vue';

export type AgentFolderAction = {
	mode: 'create' | 'rename' | 'moveFolder' | 'moveAgent' | 'delete';
	id?: string;
	name?: string;
	parentFolderId?: string | null;
	canRelocate?: boolean;
	canDelete?: boolean;
};

const props = defineProps<{ projectId: string; action: AgentFolderAction | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const name = ref('');
const target = ref(PROJECT_ROOT);
const removal = ref('relocate');
const busy = ref(false);
const loading = ref(false);
const loadFailed = ref(false);
const error = ref('');
const count = ref(0);
let generation = 0;
const destinations = ref<Array<{ id: string; label: string }>>([]);
const isNaming = computed(() => props.action?.mode === 'create' || props.action?.mode === 'rename');
const isDelete = computed(() => props.action?.mode === 'delete');
const title = computed(() => {
	if (props.action?.mode === 'create') return i18n.baseText('agents.folders.create');
	if (props.action?.mode === 'rename') return i18n.baseText('agents.folders.rename');
	if (isDelete.value) return i18n.baseText('agents.folders.deleteTitle');

	return i18n.baseText('agents.folders.move');
});

watch(
	() => props.action,
	async (action) => {
		const requestGeneration = ++generation;
		destinations.value = [];
		loading.value = false;
		loadFailed.value = false;

		if (!action) return;

		name.value = action.name ?? '';
		target.value = action.parentFolderId ?? PROJECT_ROOT;
		removal.value = action.canRelocate === false ? 'delete' : 'relocate';
		error.value = '';
		count.value = 0;

		if (isNaming.value) return;

		loading.value = true;

		try {
			const folders: Array<{ id: string; label: string }> = [];
			let skip = 0;
			let total = 0;

			do {
				const page = await getProjectFolders(
					rootStore.restApiContext,
					props.projectId,
					{ resourceType: 'agent', skip, take: 100, sortBy: 'name:asc' },
					action.mode !== 'moveAgent' ? { excludeFolderIdAndDescendants: action.id } : {},
					['id', 'name', 'path', 'updatedAt'],
				);
				if (generation !== requestGeneration) return;

				folders.push(
					...page.data.map((folder) => ({ id: folder.id, label: folder.path.join(' / ') })),
				);
				total = page.count;
				skip += page.data.length;

				if (page.data.length === 0) break;
			} while (skip < total);

			destinations.value = folders;

			if (action.mode === 'delete' && action.id) {
				const contents = await getFolderContent(
					rootStore.restApiContext,
					props.projectId,
					action.id,
				);
				if (generation !== requestGeneration) return;

				count.value = contents.totalAgents;
				target.value = PROJECT_ROOT;
			}
		} catch (cause) {
			if (generation !== requestGeneration) return;

			loadFailed.value = true;
			toast.showError(cause, i18n.baseText('agents.folders.error'));
		} finally {
			if (generation === requestGeneration) loading.value = false;
		}
	},
	{ immediate: true },
);

async function save() {
	const action = props.action;

	if (!action || loading.value || loadFailed.value || busy.value) return;

	if (isNaming.value) {
		const result = folderNameSchema.safeParse(name.value);

		if (!result.success) {
			error.value = i18n.baseText('agents.folders.invalidName');

			return;
		}

		name.value = result.data;
	}

	busy.value = true;

	try {
		const context = rootStore.restApiContext;

		if (action.mode === 'create') {
			await createFolder(
				context,
				props.projectId,
				name.value,
				action.parentFolderId ?? undefined,
				'agent',
			);
		} else if (action.id && action.mode === 'rename') {
			await renameFolder(context, props.projectId, action.id, name.value);
		} else if (action.id && action.mode === 'moveFolder') {
			await moveFolder(context, props.projectId, action.id, target.value);
		} else if (action.id && action.mode === 'moveAgent') {
			await moveAgent(
				context,
				props.projectId,
				action.id,
				target.value === PROJECT_ROOT ? null : target.value,
			);
		} else if (action.id && action.mode === 'delete') {
			await deleteFolder(
				context,
				props.projectId,
				action.id,
				removal.value === 'delete' ? undefined : target.value,
			);
		}

		invalidateProjectAgentsListCache(props.projectId);
		emit('saved');
		emit('close');
	} catch (cause) {
		toast.showError(cause, i18n.baseText('agents.folders.error'));
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<AgentModal
		:open="action !== null"
		:title="title"
		size="small"
		:busy="busy"
		@update:open="!$event && emit('close')"
	>
		<form :class="$style.fields" @submit.prevent="save">
			<template v-if="isNaming">
				<label for="agent-folder-name">{{ i18n.baseText('generic.name') }}</label>
				<N8nInput
					id="agent-folder-name"
					v-model="name"
					:maxlength="128"
					data-testid="agent-folder-name"
				/>
				<N8nText v-if="error" color="danger">{{ error }}</N8nText>
			</template>
			<template v-else>
				<N8nSelect
					v-if="isDelete"
					v-model="removal"
					:teleported="false"
					data-testid="agent-folder-removal"
				>
					<N8nOption
						v-if="action?.canRelocate !== false"
						value="relocate"
						:label="i18n.baseText('agents.folders.relocate')"
					/>
					<N8nOption
						v-if="action?.canDelete !== false"
						value="delete"
						:label="i18n.baseText('agents.folders.permanent')"
					/>
				</N8nSelect>
				<N8nText v-if="isDelete && removal === 'delete'">
					{{ i18n.baseText('agents.folders.deleteDescription', { interpolate: { count } }) }}
				</N8nText>
				<template v-else>
					<label for="agent-folder-target">{{ i18n.baseText('agents.folders.destination') }}</label>
					<N8nSelect
						id="agent-folder-target"
						v-model="target"
						:teleported="false"
						data-testid="agent-folder-target"
					>
						<N8nOption :value="PROJECT_ROOT" :label="i18n.baseText('agents.folders.root')" />
						<N8nOption
							v-for="folder in destinations"
							:key="folder.id"
							:value="folder.id"
							:label="folder.label"
						/>
					</N8nSelect>
				</template>
			</template>
		</form>
		<template #footerActions>
			<N8nButton
				:variant="isDelete && removal === 'delete' ? 'destructive' : 'solid'"
				:loading="busy"
				:disabled="loading || loadFailed"
				data-testid="agent-folder-save"
				@click="save"
			>
				{{
					isDelete && removal === 'delete'
						? i18n.baseText('agents.folders.permanent')
						: i18n.baseText('generic.save')
				}}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
