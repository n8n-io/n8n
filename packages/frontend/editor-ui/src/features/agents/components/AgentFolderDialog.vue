<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { folderNameSchema } from '@n8n/api-types';
import { PROJECT_ROOT } from 'n8n-workflow';
import {
	createFolder,
	deleteFolder,
	getFolderContent,
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
const removal = ref('');
const deleteConfirmText = ref('');
const busy = ref(false);
const loading = ref(false);
const loadFailed = ref(false);
const error = ref('');
const count = ref(0);
const subFolderCount = ref(0);
let generation = 0;
const selectedLocation = ref<ChangeLocationSearchResult | null>(null);
const isNaming = computed(() => props.action?.mode === 'create' || props.action?.mode === 'rename');
const isDelete = computed(() => props.action?.mode === 'delete');
const isMoving = computed(
	() => props.action?.mode === 'moveAgent' || props.action?.mode === 'moveFolder',
);
const confirmationText = computed(() =>
	i18n.baseText('folders.delete.typeToConfirm', {
		interpolate: { folderName: props.action?.name ?? '' },
	}),
);
const canSave = computed(() => {
	if (loading.value || loadFailed.value || busy.value) return false;

	if (isDelete.value) {
		return removal.value === 'relocate'
			? selectedLocation.value !== null
			: removal.value === 'archive' && deleteConfirmText.value === confirmationText.value;
	}

	return !isMoving.value || selectedLocation.value !== null;
});
const contentDescription = computed(() => {
	const labels: string[] = [];

	if (subFolderCount.value > 0) {
		labels.push(
			i18n.baseText('folders.move.modal.folder.count', {
				interpolate: { count: subFolderCount.value },
			}),
		);
	}

	if (count.value > 0) {
		labels.push(
			i18n.baseText('agents.folders.agentCount', { interpolate: { count: count.value } }),
		);
	}

	return labels.length
		? i18n.baseText('agents.folders.deleteContents', {
				interpolate: { contents: labels.join(` ${i18n.baseText('generic.and')} `) },
			})
		: i18n.baseText('agents.folders.deleteContentsFallback');
});
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

	if (isDelete.value) {
		return i18n.baseText('folders.delete.confirm.title', {
			interpolate: { folderName: props.action?.name ?? '' },
		});
	}

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
		loading.value = false;
		loadFailed.value = false;
		selectedLocation.value = null;

		if (!action) return;

		name.value = action.name ?? '';
		target.value = action.parentFolderId ?? PROJECT_ROOT;
		removal.value = '';
		deleteConfirmText.value = '';
		error.value = '';
		count.value = 0;
		subFolderCount.value = 0;

		if (action.mode !== 'delete' || !action.id) return;

		loading.value = true;

		try {
			const contents = await getFolderContent(rootStore.restApiContext, props.projectId, action.id);

			if (generation !== requestGeneration) return;

			count.value = contents.totalAgents;
			subFolderCount.value = contents.totalSubFolders;
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
}

function onDestinationError(cause: unknown) {
	selectedLocation.value = null;
	toast.showError(cause, i18n.baseText('agents.folders.error'));
}

async function save() {
	const action = props.action;

	if (!action || !canSave.value) return;

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
		:size="isDelete ? 'large' : isMoving ? 'medium' : 'small'"
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
			<template v-else-if="isDelete">
				<N8nText id="agent-folder-delete-description">{{ contentDescription }}</N8nText>
				<N8nRadioGroup
					v-model="removal"
					aria-labelledby="agent-folder-delete-description"
					data-testid="agent-folder-removal"
				>
					<N8nRadioGroupItem
						v-if="action?.canRelocate !== false"
						value="relocate"
						data-testid="agent-folder-relocate"
					>
						<template #label>
							<N8nText>{{
								i18n.baseText(
									projectName ? 'agents.folders.relocate' : 'agents.folders.relocate.noProject',
									{ interpolate: { projectName: projectName ?? '' } },
								)
							}}</N8nText>
						</template>
						<template #content>
							<div v-if="removal === 'relocate'" :class="$style.optionContent">
								<label for="agent-folder-target">{{
									i18n.baseText('folders.transfer.selectFolder')
								}}</label>
								<MoveToFolderDropdown
									:key="action?.id"
									input-id="agent-folder-target"
									:selected-location="selectedLocation"
									:selected-project-id="projectId"
									:current-project-id="projectId"
									:current-folder-id="action?.id"
									resource-type="agent"
									:teleported="false"
									data-testid="agent-folder-target"
									@location:selected="onLocationSelected"
									@load:error="onDestinationError"
								/>
							</div>
						</template>
					</N8nRadioGroupItem>
					<N8nRadioGroupItem
						v-if="action?.canDelete !== false"
						value="archive"
						data-testid="agent-folder-archive"
					>
						<template #label>
							<N8nText>{{ i18n.baseText('agents.folders.archive') }}</N8nText>
						</template>
						<template #content>
							<div v-if="removal === 'archive'" :class="$style.optionContent">
								<N8nText>
									{{
										i18n.baseText('agents.folders.archiveDescription', {
											adjustToNumber: count,
											interpolate: { count },
										})
									}}
								</N8nText>
								<N8nInputLabel
									input-name="agent-folder-delete-confirm"
									:label="
										i18n.baseText('folders.delete.confirmation.message', {
											interpolate: { folderName: action?.name ?? '' },
										})
									"
								>
									<N8nInput
										id="agent-folder-delete-confirm"
										v-model="deleteConfirmText"
										:placeholder="confirmationText"
										data-testid="agent-folder-delete-confirm"
									/>
								</N8nInputLabel>
							</div>
						</template>
					</N8nRadioGroupItem>
				</N8nRadioGroup>
			</template>
		</form>
		<template #footerActions>
			<N8nButton
				:variant="isDelete ? 'destructive' : 'solid'"
				:loading="busy"
				:disabled="!canSave"
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

.optionContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}
</style>
