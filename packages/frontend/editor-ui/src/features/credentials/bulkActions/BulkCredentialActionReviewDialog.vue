<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nText } from '@n8n/design-system';

import BulkActionReviewDialogShell from '@/app/components/common/BulkActionReviewDialogShell.vue';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import type { ProjectSearchFn } from '@/features/collaboration/projects/projects.utils';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { canUseCredentialBulkMoveDestination } from './useBulkCredentialActions';

import type {
	BulkCredentialActionConfig,
	ResolvedBulkCredentialAction,
} from './bulkCredentialActions.types';

const props = defineProps<{
	open: boolean;
	action: ResolvedBulkCredentialAction | null;
	submitting: boolean;
	errorMessage: string | null;
	errorDetails: string[];
	projectSearchFn: ProjectSearchFn;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [config: BulkCredentialActionConfig];
}>();

const i18n = useI18n();
const destinationProject = ref<ProjectSharingData | null>(null);

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) destinationProject.value = null;
	},
);

const actionId = computed(() => props.action?.id ?? null);
const affected = computed(() => props.action?.affected ?? []);
const isMove = computed(() => actionId.value === 'move');
const isDelete = computed(() => actionId.value === 'delete');
const hasResolvableCredentials = computed(() =>
	affected.value.some((credential) => credential.isResolvable),
);

const title = computed(() =>
	actionId.value ? i18n.baseText(`credentials.bulkActions.review.title.${actionId.value}`) : '',
);
const confirmLabel = computed(() =>
	actionId.value ? i18n.baseText(`credentials.bulkActions.review.confirm.${actionId.value}`) : '',
);
const summary = computed(() =>
	i18n.baseText('credentials.bulkActions.review.summary', {
		adjustToNumber: affected.value.length,
		interpolate: { count: String(affected.value.length) },
	}),
);
const affectedHeading = computed(() =>
	i18n.baseText('credentials.bulkActions.review.affectedHeading', {
		adjustToNumber: affected.value.length,
		interpolate: { count: String(affected.value.length) },
	}),
);

const projectFilter = (project: Parameters<typeof canUseCredentialBulkMoveDestination>[0]) =>
	canUseCredentialBulkMoveDestination(project, affected.value);

const close = () => {
	if (props.submitting) return;
	emit('update:open', false);
};

const confirm = () => {
	if (isMove.value) {
		if (!destinationProject.value) return;
		emit('confirm', { destinationProjectId: destinationProject.value.id });
		return;
	}
	emit('confirm', {});
};
</script>

<template>
	<BulkActionReviewDialogShell
		:open="open"
		:title="title"
		:summary="summary"
		:confirm-label="confirmLabel"
		:affected="affected"
		:affected-heading="affectedHeading"
		:submitting="submitting"
		:confirm-disabled="isMove && !destinationProject"
		:destructive="isDelete"
		:error-message="errorMessage"
		:error-details="errorDetails"
		@update:open="close"
		@confirm="confirm"
	>
		<N8nCallout v-if="isDelete" theme="danger" :class="$style.callout">
			{{ i18n.baseText('credentials.bulkActions.review.delete.warning') }}
		</N8nCallout>

		<div v-if="isMove" :class="$style.block">
			<N8nText color="text-dark">
				{{ i18n.baseText('credentials.bulkActions.review.move.destinationLabel') }}
			</N8nText>
			<ProjectSharing
				v-model="destinationProject"
				class="pt-2xs"
				:search-fn="projectSearchFn"
				:filter-fn="projectFilter"
				:placeholder="i18n.baseText('credentials.bulkActions.review.move.placeholder')"
			/>
			<N8nCallout theme="warning" :class="$style.callout">
				{{ i18n.baseText('credentials.bulkActions.review.move.warning') }}
			</N8nCallout>
			<N8nCallout v-if="hasResolvableCredentials" theme="warning" :class="$style.callout">
				{{ i18n.baseText('credentials.bulkActions.review.move.connectionsWarning') }}
			</N8nCallout>
		</div>
	</BulkActionReviewDialogShell>
</template>

<style lang="scss" module>
.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.callout {
	margin: 0;
}
</style>
