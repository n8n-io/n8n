<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nText } from '@n8n/design-system';

import BulkActionReviewDialogShell from '@/app/components/common/BulkActionReviewDialogShell.vue';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import MoveToFolderDropdown from '@/features/core/folders/components/MoveToFolderDropdown.vue';
import type { ProjectSearchFn } from '@/features/collaboration/projects/projects.utils';
import type {
	ProjectListItem,
	ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import type { ChangeLocationSearchResult } from '@/features/core/folders/folders.types';

import type {
	BulkActionConfig,
	BulkMoveDestination,
	ResolvedBulkAction,
} from './bulkActions.types';

const props = defineProps<{
	open: boolean;
	action: ResolvedBulkAction | null;
	submitting: boolean;
	errorMessage: string | null;
	projectSearchFn: ProjectSearchFn;
	moveFilterFn?: (project: ProjectListItem) => boolean;
	currentProjectId?: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [config: BulkActionConfig];
}>();

const i18n = useI18n();

const shareRecipients = ref<ProjectSharingData[]>([]);
const moveProject = ref<ProjectSharingData | null>(null);
const moveFolder = ref<ChangeLocationSearchResult | null>(null);

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;
		shareRecipients.value = [];
		moveProject.value = null;
		moveFolder.value = null;
	},
);

const actionId = computed(() => props.action?.id ?? null);
const affected = computed(() => props.action?.affected ?? []);
const unchanged = computed(() => props.action?.unchanged ?? []);
const affectedCount = computed(() => affected.value.length);
const unchangedCount = computed(() => unchanged.value.length);
const selectedCount = computed(() => affectedCount.value + unchangedCount.value);

const isShare = computed(() => actionId.value === 'share');
const isMove = computed(() => actionId.value === 'move');
const isDelete = computed(() => actionId.value === 'delete');

const title = computed(() =>
	actionId.value ? i18n.baseText(`workflows.bulkActions.review.title.${actionId.value}`) : '',
);

const confirmLabel = computed(() =>
	actionId.value ? i18n.baseText(`workflows.bulkActions.review.confirm.${actionId.value}`) : '',
);

const summary = computed(() =>
	i18n.baseText('workflows.bulkActions.review.summary', {
		adjustToNumber: selectedCount.value,
		interpolate: {
			selected: String(selectedCount.value),
			affected: String(affectedCount.value),
		},
	}),
);

const affectedHeading = computed(() =>
	i18n.baseText('workflows.bulkActions.review.affectedHeading'),
);

const unchangedHeading = computed(() =>
	i18n.baseText('workflows.bulkActions.review.unchangedHeading', {
		adjustToNumber: unchangedCount.value,
		interpolate: { count: String(unchangedCount.value) },
	}),
);

const moveDestination = computed<BulkMoveDestination | null>(() => {
	if (!moveProject.value) return null;
	const folder = moveFolder.value;
	// The dropdown auto-selects the project root, whose id equals the project id.
	const isRealFolder = folder && folder.id !== moveProject.value.id;
	return {
		projectId: moveProject.value.id,
		projectName: moveProject.value.name ?? moveProject.value.id,
		folderId: isRealFolder ? folder.id : undefined,
		folderName: isRealFolder ? folder.name : undefined,
		changesOwnership: !!props.currentProjectId && moveProject.value.id !== props.currentProjectId,
	};
});

const confirmDisabled = computed(() => {
	if (props.submitting) return true;
	if (isShare.value) return shareRecipients.value.length === 0;
	if (isMove.value) return !moveProject.value;
	return false;
});

const close = () => {
	if (props.submitting) return;
	emit('update:open', false);
};

const onConfirm = () => {
	if (confirmDisabled.value) return;
	if (isShare.value) {
		emit('confirm', { shareRecipients: shareRecipients.value });
	} else if (isMove.value) {
		emit('confirm', { moveDestination: moveDestination.value });
	} else {
		emit('confirm', {});
	}
};
</script>

<template>
	<BulkActionReviewDialogShell
		:open="open"
		:title="title"
		:summary="summary"
		:confirm-label="confirmLabel"
		:affected="affected"
		:unchanged="unchanged"
		:affected-heading="affectedHeading"
		:unchanged-heading="unchangedHeading"
		:submitting="submitting"
		:confirm-disabled="confirmDisabled"
		:destructive="isDelete"
		:error-message="errorMessage"
		@update:open="close"
		@confirm="onConfirm"
	>
		<N8nCallout v-if="isDelete" theme="danger" :class="$style.callout">
			{{ i18n.baseText('workflows.bulkActions.review.delete.permanent') }}
		</N8nCallout>

		<!-- Share: pick recipients to add -->
		<div v-if="isShare" :class="$style.block">
			<N8nText color="text-dark">
				{{ i18n.baseText('workflows.bulkActions.review.share.label') }}
			</N8nText>
			<ProjectSharing
				v-model="shareRecipients"
				class="pt-2xs"
				:search-fn="projectSearchFn"
				:placeholder="i18n.baseText('workflows.bulkActions.review.share.placeholder')"
				:roles="[]"
			/>
		</div>

		<!-- Move: destination project + folder -->
		<div v-if="isMove" :class="$style.block">
			<N8nText color="text-dark">
				{{ i18n.baseText('folders.move.modal.project.label') }}
			</N8nText>
			<ProjectSharing
				v-model="moveProject"
				class="pt-2xs"
				:search-fn="projectSearchFn"
				:filter-fn="moveFilterFn"
				:placeholder="i18n.baseText('folders.move.modal.project.placeholder')"
			/>
			<template v-if="moveProject">
				<N8nText color="text-dark" class="mt-2xs">
					{{ i18n.baseText('folders.move.modal.folder.label') }}
				</N8nText>
				<MoveToFolderDropdown
					:selected-location="moveFolder"
					:selected-project-id="moveProject.id"
					:current-project-id="currentProjectId"
					@location:selected="moveFolder = $event"
				/>
			</template>
			<N8nCallout v-if="moveDestination?.changesOwnership" theme="warning" :class="$style.callout">
				{{ i18n.baseText('workflows.bulkActions.review.move.ownershipWarning') }}
			</N8nCallout>
		</div>
	</BulkActionReviewDialogShell>
</template>

<style lang="scss" module>
.block {
	display: flex;
	flex-direction: column;
}

.callout {
	margin: 0;
}
</style>
