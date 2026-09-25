<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import PromotionBindingsDialog from './PromotionBindingsDialog.vue';
import { usePromotionBindingCreation } from '../composables/usePromotionBindingCreation';
import type {
	AppliedResult,
	BlockedApplyResult,
	CreatedPromotionBinding,
	CreatedPromotionProject,
	SourceChangedResult,
} from '../promotions.types';

const props = defineProps<{
	open: boolean;
	blockedResult: BlockedApplyResult;
	// Forwarded to the dialog when the apply resumes a workflow selection.
	continueWith?: { projectId: string; workflowIds: string[] };
}>();
const emit = defineEmits<{
	'update:open': [open: boolean];
	applied: [result: AppliedResult];
	'source-changed': [result: SourceChangedResult];
	'close-requested': [resources: CreatedPromotionBinding[]];
	'project-created': [project: CreatedPromotionProject];
}>();
const i18n = useI18n();
const { createBinding, createdProjects, updatePreflight } = usePromotionBindingCreation(
	props.blockedResult,
	(project) => emit('project-created', project),
);
</script>

<template>
	<PromotionBindingsDialog
		:open="open"
		:blocked-result="blockedResult"
		:create-binding="createBinding"
		:continue-with="continueWith"
		@update:open="emit('update:open', $event)"
		@preflight-updated="updatePreflight"
		@applied="emit('applied', $event)"
		@source-changed="emit('source-changed', $event)"
		@close-requested="emit('close-requested', $event)"
	>
		<template #notices>
			<N8nCallout v-for="project in createdProjects" :key="project.id" theme="info">
				{{
					i18n.baseText('promotions.bindings.projectSetup.retained', {
						interpolate: { projectName: project.name },
					})
				}}
			</N8nCallout>
		</template>
	</PromotionBindingsDialog>
</template>
