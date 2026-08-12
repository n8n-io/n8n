<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nLink,
	N8nText,
} from '@n8n/design-system';

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
import { getBulkSelectionCount } from './bulkActions.utils';

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
const showAffected = ref(false);
const showUnchanged = ref(false);

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;
		shareRecipients.value = [];
		moveProject.value = null;
		moveFolder.value = null;
		showAffected.value = false;
		showUnchanged.value = false;
	},
);

const actionId = computed(() => props.action?.id ?? null);
const affected = computed(() => props.action?.affected ?? []);
const unchanged = computed(() => props.action?.unchanged ?? []);
const affectedCount = computed(() => getBulkSelectionCount(affected.value));
const unchangedCount = computed(() => getBulkSelectionCount(unchanged.value));
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
			unchanged: String(unchangedCount.value),
		},
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
	<N8nDialog
		:open="open"
		size="medium"
		:show-close-button="!submitting"
		:disable-outside-pointer-events="true"
		data-test-id="bulk-action-review-dialog"
		@update:open="close"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div :class="$style.body">
			<N8nText color="text-base">{{ summary }}</N8nText>

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
				<N8nCallout
					v-if="moveDestination?.changesOwnership"
					theme="warning"
					:class="$style.callout"
				>
					{{ i18n.baseText('workflows.bulkActions.review.move.ownershipWarning') }}
				</N8nCallout>
			</div>

			<!-- Affected panel -->
			<div v-if="affected.length" :class="$style.panel">
				<N8nLink theme="text" @click="showAffected = !showAffected">
					{{
						i18n.baseText('workflows.bulkActions.review.affectedHeading', {
							adjustToNumber: affectedCount,
							interpolate: { count: String(affectedCount) },
						})
					}}
				</N8nLink>
				<ul v-if="showAffected" :class="$style.list" data-test-id="bulk-action-affected-list">
					<li v-for="item in affected" :key="`${item.resourceType}:${item.id}`">
						<N8nText size="small">{{ item.name }}</N8nText>
					</li>
				</ul>
			</div>

			<!-- No-change panel -->
			<div v-if="unchanged.length" :class="$style.panel">
				<N8nLink theme="text" @click="showUnchanged = !showUnchanged">
					{{
						i18n.baseText('workflows.bulkActions.review.unchangedHeading', {
							adjustToNumber: unchangedCount,
							interpolate: { count: String(unchangedCount) },
						})
					}}
				</N8nLink>
				<ul v-if="showUnchanged" :class="$style.list" data-test-id="bulk-action-unchanged-list">
					<li v-for="item in unchanged" :key="`${item.resourceType}:${item.id}`">
						<N8nText size="small" color="text-light">{{ item.name }}</N8nText>
					</li>
				</ul>
			</div>

			<N8nCallout v-if="errorMessage" theme="danger" :class="$style.callout">
				{{ errorMessage }}
			</N8nCallout>
		</div>

		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:disabled="submitting"
				data-test-id="bulk-action-cancel"
				@click="close"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				:variant="isDelete ? 'destructive' : 'solid'"
				:loading="submitting"
				:disabled="confirmDisabled"
				data-test-id="bulk-action-confirm"
				@click="onConfirm"
			>
				{{ confirmLabel }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--xs);
}

.block {
	display: flex;
	flex-direction: column;
}

.callout {
	margin: 0;
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.list {
	max-height: 160px;
	overflow-y: auto;
	margin: 0;
	padding: var(--spacing--3xs) 0 0 var(--spacing--md);
	list-style: disc;

	li {
		padding: var(--spacing--5xs) 0;
	}
}
</style>
