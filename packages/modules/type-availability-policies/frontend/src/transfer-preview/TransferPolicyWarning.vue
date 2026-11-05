<script setup lang="ts">
import { POLICY_VIOLATION_SUBJECT_TYPE, type PolicyViolation } from '@n8n/api-types';
import { N8nCallout, N8nLink } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';

import RestrictedTypesDialog from './RestrictedTypesDialog.vue';
import type { TransferPreview, TransferPreviewTarget } from './useTransferPreview';

const { preview, resourceType, projectId, projectName, labelOf } = defineProps<{
	preview: TransferPreview;
	resourceType: TransferPreviewTarget['resourceType'];
	projectId: string;
	projectName: string;
	labelOf: (violation: PolicyViolation) => string | undefined;
}>();

defineSlots<{ icon(props: { violation: PolicyViolation }): unknown }>();

const i18n = useI18n();

const isDialogOpen = ref(false);

const hasRestricted = computed(() => preview.restricted.length > 0);
const unpublishCount = computed(() => {
	if (resourceType === 'workflow') return preview.unpublishReasons.length > 0 ? 1 : 0;
	if (resourceType === 'folder') return preview.workflowsToUnpublish.length;
	return 0;
});
const canListRestricted = computed(() => hasRestricted.value && resourceType !== 'credential');

/** Counts each type once: a folder preview can repeat a type across workflows. */
function typesPhrase(violations: PolicyViolation[]): string {
	const countOf = (subjectType: string) =>
		new Set(violations.filter((v) => v.subjectType === subjectType).map((v) => v.subject)).size;
	const phrase = (key: BaseTextKey, count: number) =>
		i18n.baseText(key, { adjustToNumber: count, interpolate: { count } });

	const nodes = countOf(POLICY_VIOLATION_SUBJECT_TYPE.nodeType);
	const credentials = countOf(POLICY_VIOLATION_SUBJECT_TYPE.credentialType);
	const nodesText = phrase('typeAvailabilityPolicies.transfer.count.nodes', nodes);
	const credentialsText = phrase(
		'typeAvailabilityPolicies.transfer.count.credentials',
		credentials,
	);

	if (nodes > 0 && credentials > 0) {
		return i18n.baseText('typeAvailabilityPolicies.transfer.count.nodesAndCredentials', {
			interpolate: { nodes: nodesText, credentials: credentialsText },
		});
	}
	if (nodes > 0) return nodesText;
	if (credentials > 0) return credentialsText;
	return phrase('typeAvailabilityPolicies.transfer.count.items', violations.length);
}

/** Unpublishing is the consequence users miss, so it gets the title. */
const title = computed(() => {
	if (unpublishCount.value === 0) return null;
	return resourceType === 'folder'
		? i18n.baseText('typeAvailabilityPolicies.transfer.title.folder', {
				adjustToNumber: unpublishCount.value,
				interpolate: { count: unpublishCount.value },
			})
		: i18n.baseText('typeAvailabilityPolicies.transfer.title.workflow');
});

const body = computed(() => {
	if (hasRestricted.value) {
		if (resourceType === 'credential') {
			const [violation] = preview.restricted;
			const type = labelOf(violation) ?? violation.subject ?? violation.message;
			return i18n.baseText('typeAvailabilityPolicies.transfer.restricted.credential', {
				interpolate: { type, project: projectName },
			});
		}
		return i18n.baseText(`typeAvailabilityPolicies.transfer.restricted.${resourceType}`, {
			interpolate: { types: typesPhrase(preview.restricted), project: projectName },
		});
	}

	if (unpublishCount.value > 0) {
		return resourceType === 'folder'
			? i18n.baseText('typeAvailabilityPolicies.transfer.unpublish.folder', {
					interpolate: { project: projectName },
				})
			: i18n.baseText('typeAvailabilityPolicies.transfer.unpublish.workflow', {
					interpolate: { types: typesPhrase(preview.unpublishReasons), project: projectName },
				});
	}

	if (preview.checkFailed) {
		return i18n.baseText('typeAvailabilityPolicies.transfer.checkFailed', {
			interpolate: { project: projectName },
		});
	}

	return null;
});

const checkFailedNote = computed(() =>
	preview.checkFailed && (hasRestricted.value || unpublishCount.value > 0)
		? i18n.baseText('typeAvailabilityPolicies.transfer.checkFailed.also')
		: null,
);
</script>

<template>
	<div v-if="body">
		<N8nCallout theme="warning" data-test-id="transfer-policy-warning">
			<strong v-if="title" :class="$style.title" data-test-id="transfer-policy-warning-title">
				{{ title }}
			</strong>
			{{ [body, checkFailedNote].filter(Boolean).join(' ') }}
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
			:project-id="projectId"
			:project-name="projectName"
			:label-of="labelOf"
		>
			<template #icon="{ violation }">
				<slot name="icon" :violation="violation" />
			</template>
		</RestrictedTypesDialog>
	</div>
</template>

<style lang="scss" module>
.title {
	display: block;
	font-weight: var(--font-weight--bold);
}
</style>
