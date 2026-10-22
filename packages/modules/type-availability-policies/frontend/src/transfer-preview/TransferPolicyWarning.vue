<script setup lang="ts">
import type { PolicyViolation } from '@n8n/api-types';
import { N8nCallout, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import RestrictedTypesDialog from './RestrictedTypesDialog.vue';
import type { TransferPreview, TransferPreviewTarget } from './useTransferPreview';

const { preview, resourceType, projectName, labelOf } = defineProps<{
	preview: TransferPreview;
	resourceType: TransferPreviewTarget['resourceType'];
	projectName: string;
	labelOf: (violation: PolicyViolation) => string | undefined;
}>();

const slots = defineSlots<{ icon?(props: { violation: PolicyViolation }): unknown }>();

const i18n = useI18n();

const isDialogOpen = ref(false);

const hasRestricted = computed(() => preview.restricted.length > 0);
const unpublishCount = computed(() => {
	if (resourceType === 'workflow') return preview.unpublishReasons.length > 0 ? 1 : 0;
	if (resourceType === 'folder') return preview.workflowsToUnpublish.length;
	return 0;
});
const canListRestricted = computed(() => hasRestricted.value && resourceType !== 'credential');

/** The opening sentence names the main consequence; the follow-ups add the others. */
const lead = computed(() => {
	const project = projectName;

	if (hasRestricted.value) {
		if (resourceType === 'credential') {
			const [violation] = preview.restricted;
			const type = labelOf(violation) ?? violation.subject ?? violation.message;
			return i18n.baseText('typeAvailabilityPolicies.transfer.restricted.credential', {
				interpolate: { type, project },
			});
		}
		return i18n.baseText(`typeAvailabilityPolicies.transfer.restricted.${resourceType}`, {
			interpolate: { project },
		});
	}

	if (unpublishCount.value > 0) {
		return resourceType === 'folder'
			? i18n.baseText('typeAvailabilityPolicies.transfer.unpublish.folder', {
					adjustToNumber: unpublishCount.value,
					interpolate: { count: unpublishCount.value, project },
				})
			: i18n.baseText('typeAvailabilityPolicies.transfer.unpublish.workflow', {
					interpolate: { project },
				});
	}

	if (preview.checkFailed) {
		return i18n.baseText('typeAvailabilityPolicies.transfer.checkFailed', {
			interpolate: { resource: i18n.baseText(`generic.${resourceType}`).toLowerCase(), project },
		});
	}

	return null;
});

const followUps = computed(() => {
	if (!lead.value) return [];

	const sentences: string[] = [];
	if (hasRestricted.value && unpublishCount.value > 0) {
		sentences.push(
			resourceType === 'folder'
				? i18n.baseText('typeAvailabilityPolicies.transfer.unpublish.folder.also', {
						adjustToNumber: unpublishCount.value,
						interpolate: { count: unpublishCount.value },
					})
				: i18n.baseText('typeAvailabilityPolicies.transfer.unpublish.workflow.also'),
		);
	}
	if (preview.checkFailed && (hasRestricted.value || unpublishCount.value > 0)) {
		sentences.push(i18n.baseText('typeAvailabilityPolicies.transfer.checkFailed.also'));
	}
	return sentences;
});
</script>

<template>
	<div v-if="lead">
		<N8nCallout theme="warning" data-test-id="transfer-policy-warning">
			{{ [lead, ...followUps].join(' ') }}
			<N8nLink
				v-if="canListRestricted"
				size="small"
				data-test-id="transfer-policy-warning-view-restricted"
				@click="isDialogOpen = true"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.transfer.viewRestricted') }}
			</N8nLink>
		</N8nCallout>
		<RestrictedTypesDialog
			v-if="canListRestricted"
			v-model:open="isDialogOpen"
			:violations="preview.restricted"
			:project-name="projectName"
			:label-of="labelOf"
		>
			<template v-if="slots.icon" #icon="{ violation }">
				<slot name="icon" :violation="violation" />
			</template>
		</RestrictedTypesDialog>
	</div>
</template>
