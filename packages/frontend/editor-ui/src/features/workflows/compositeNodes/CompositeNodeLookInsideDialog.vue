<script setup lang="ts">
import { N8nDialog, N8nDialogBody, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import WorkflowPreview from '@/app/components/WorkflowPreview.vue';

import { useCompositeNodeLookInsideStore } from './compositeNodeLookInside.store';

const i18n = useI18n();
const store = useCompositeNodeLookInsideStore();
</script>

<template>
	<N8nDialog
		v-if="store.previewWorkflow && store.nodeName"
		open
		size="full"
		:header="
			i18n.baseText('compositeNode.lookInside.title', {
				interpolate: { nodeName: store.nodeName },
			})
		"
		data-test-id="composite-node-look-inside-dialog"
		@update:open="!$event && store.close()"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText tag="p" color="text-light">
				{{
					store.nodeStatuses
						? i18n.baseText('compositeNode.lookInside.description.withExecution')
						: i18n.baseText('compositeNode.lookInside.description')
				}}
			</N8nText>
			<div :class="$style.canvas">
				<WorkflowPreview
					mode="workflow"
					:workflow="store.previewWorkflow"
					:node-statuses="store.nodeStatuses"
					:execution-status="store.executionStatus"
					:can-open-ndv="true"
					hide-node-issues
					suppress-notifications
					loader-type="spinner"
				/>
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	height: 100%;
}

.canvas {
	// WorkflowPreview fills its parent, so the parent needs a fixed height.
	height: 70vh;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
