<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import WorkflowDiffPlaceholder from '@/features/workflows/workflowDiff/WorkflowDiffPlaceholder.vue';

import type { WorkflowShellStatus } from '../../promotionPreview.workflow';
import PromotionWorkflowSideLabel from './PromotionWorkflowSideLabel.vue';

defineProps<{
	status: WorkflowShellStatus;
	workflowName: string;
	direction: PromotionDirection;
	branchName?: string;
}>();
const emit = defineEmits<{ activate: []; retry: []; refresh: [] }>();
const i18n = useI18n();
</script>

<template>
	<!-- The real diff follows a loading state, so the illustration would only flash. -->
	<WorkflowDiffPlaceholder :hide-illustration="status === 'loading'">
		<template #sourceLabel>
			<PromotionWorkflowSideLabel side="before" :direction="direction" :branch-name="branchName" />
		</template>
		<template #targetLabel>
			<PromotionWorkflowSideLabel side="after" :direction="direction" :branch-name="branchName" />
		</template>
		<N8nButton
			v-if="status === 'idle'"
			variant="outline"
			size="xlarge"
			:aria-label="
				i18n.baseText('promotions.preview.workflow.showDiffOf', {
					interpolate: { name: workflowName },
				})
			"
			@click="emit('activate')"
		>
			{{ i18n.baseText('promotions.preview.workflow.showDiff') }}
		</N8nButton>
		<N8nButton v-else-if="status === 'loading'" variant="outline" loading disabled>
			{{ i18n.baseText('promotions.preview.workflow.loadingDiff') }}
		</N8nButton>
		<template v-else-if="status === 'error'">
			<N8nText color="text-light">{{
				i18n.baseText('promotions.preview.card.loadFailed')
			}}</N8nText>
			<N8nButton variant="outline" @click="emit('retry')">
				{{ i18n.baseText('promotions.preview.state.retry') }}
			</N8nButton>
		</template>
		<template v-else-if="status === 'missing'">
			<N8nText color="text-light">{{ i18n.baseText('promotions.preview.card.missing') }}</N8nText>
			<N8nButton variant="outline" @click="emit('refresh')">
				{{ i18n.baseText('promotions.preview.refresh') }}
			</N8nButton>
		</template>
		<N8nText v-else color="text-light">
			{{ i18n.baseText('promotions.preview.card.unreadable') }}
		</N8nText>
	</WorkflowDiffPlaceholder>
</template>
