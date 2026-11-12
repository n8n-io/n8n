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
import MoveToFolderDropdown from '@/features/core/folders/components/MoveToFolderDropdown.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import type { ChangeLocationSearchResult } from '@/features/core/folders/folders.types';
import { useAgentProjectBreadcrumb } from '../composables/useAgentProjectBreadcrumb';

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
const { projectName, projectIcon } = useAgentProjectBreadcrumb(computed(() => props.projectId));
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
const selectedLocation = ref<ChangeLocationSearchResult | null>(null);
const isNaming = computed(() => props.action?.mode === 'create' || props.action?.mode === 'rename');
const isDelete = computed(() => props.action?.mode === 'delete');
const isMoving = computed(
	() => props.action?.mode === 'moveAgent' || props.action?.mode === 'moveFolder',
);
const moveLabel = computed(() =>
	props.action?.mode === 'moveAgent'
		? i18n.baseText('agents.folders.moveAgent')
		: i18n.baseText('folders.move.modal.confirm', {
				interpolate: { resourceTypeLabel: i18n.baseText('generic.folder').toLowerCase() },
			}),
);
const title = computed(() => {
	if (props.action?.mode === 'create') return i18n.baseText('agents.folders.create');
	if (props.action?.mode === 'rename') return i18n.baseText('agents.folders.rename');
	if (isDelete.value) return i18n.baseText('agents.folders.deleteTitle');

	if (props.action?.mode === 'moveAgent') {
		return i18n
			.baseText('agents.folders.moveAgentTitle', {
				interpolate: { name: props.action.name ?? '' },
			})
			.trim();
	}

	return i18n
		.baseText('folders.move.modal.title', {
			interpolate: {
				resourceTypeLabel: i18n.baseText('generic.folder').toLowerCase(),
				folderName: props.action?.name ?? '',
			},
		})
		.trim();
});

watch(
	() => props.action,
	async (action) => {
		const requestGeneration = ++generation;
		destinations.value = [];
		loading.value = false;
		loadFailed.value = false;
		selectedLocation.value = null;

		if (!action) return;

		name.value = action.name ?? '';
		target.value = action.parentFolderId ?? PROJECT_ROOT;
		removal.value = action.canRelocate === false ? 'archive' : 'relocate';
		error.value = '';
		count.value = 0;

		if (isNaming.value || isMoving.value) return;

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

function onLocationSelected(location: ChangeLocationSearchResult) {
	selectedLocation.value = location;
	target.value = location.resource === 'project' ? PROJECT_ROOT : location.id;
	loadFailed.value = false;
}

function onDestinationError(cause: unknown) {
	loadFailed.value = true;
	toast.showError(cause, i18n.baseText('agents.folders.error'));
}

async function save() {
	const action = props.action;

	if (!action || loading.value || loadFailed.value || busy.value) return;

	if (isMoving.value && !selectedLocation.value) return;

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
				removal.value === 'archive' ? undefined : target.value,
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
		:size="isMoving ? 'medium' : 'small'"
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
			<template v-else-if="isMoving">
				<div :class="$style.field">
					<label for="agent-move-project">{{
						i18n.baseText('folders.move.modal.project.label')
					}}</label>
					<N8nInput
						id="agent-move-project"
						:model-value="projectName ?? ''"
						disabled
						:title="i18n.baseText('agents.folders.sameProject')"
						data-testid="agent-move-project"
					>
						<template #prefix>
							<ProjectIcon :icon="projectIcon" size="small" border-less />
						</template>
					</N8nInput>
				</div>
				<div :class="$style.field">
					<label for="agent-folder-target">{{
						i18n.baseText('folders.move.modal.folder.label')
					}}</label>
					<MoveToFolderDropdown
						:key="action?.id"
						input-id="agent-folder-target"
						:selected-location="selectedLocation"
						:selected-project-id="projectId"
						:current-project-id="projectId"
						:current-folder-id="action?.mode === 'moveFolder' ? action.id : undefined"
						:parent-folder-id="action?.parentFolderId ?? undefined"
						resource-type="agent"
						autofocus
						:teleported="false"
						data-testid="agent-folder-target"
						@location:selected="onLocationSelected"
						@load:error="onDestinationError"
					/>
				</div>
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
						value="archive"
						:label="i18n.baseText('agents.folders.archive')"
					/>
				</N8nSelect>
				<N8nText v-if="isDelete && removal === 'archive'">
					{{
						i18n.baseText('agents.folders.archiveDescription', {
							adjustToNumber: count,
							interpolate: { count },
						})
					}}
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
				:variant="isDelete ? 'destructive' : 'solid'"
				:loading="busy"
				:disabled="loading || loadFailed || (isMoving && !selectedLocation)"
				data-testid="agent-folder-save"
				@click="save"
			>
				{{
					isDelete
						? i18n.baseText('agents.folders.deleteTitle')
						: isMoving
							? moveLabel
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
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
