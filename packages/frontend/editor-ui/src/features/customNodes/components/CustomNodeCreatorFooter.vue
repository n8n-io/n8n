<script lang="ts" setup>
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CUSTOM_NODE_WIZARD_MODAL_KEY } from '../customNodes.constants';

/**
 * Entry point to the custom node wizard inside the nodes panel. Rendered as
 * the last item of the list, and highlighted when a search has no results.
 */
defineProps<{
	highlighted?: boolean;
	search?: string;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const nodeCreatorStore = useNodeCreatorStore();
const workflowsStore = useWorkflowsStore();

function openWizard() {
	nodeCreatorStore.setNodeCreatorState({
		createNodeActive: false,
		workflowId: workflowsStore.workflowId,
	});
	uiStore.openModalWithData({ name: CUSTOM_NODE_WIZARD_MODAL_KEY, data: {} });
}
</script>

<template>
	<div
		:class="[$style.footer, { [$style.highlighted]: highlighted }]"
		data-test-id="node-creator-custom-node-footer"
	>
		<N8nIcon icon="blocks" :size="highlighted ? 'xlarge' : 'large'" :class="$style.icon" />
		<div :class="$style.text">
			<N8nText bold size="small">
				{{
					highlighted
						? i18n.baseText('customNodes.nodeCreator.noResults.title')
						: i18n.baseText('customNodes.nodeCreator.footer.title')
				}}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{
					highlighted
						? i18n.baseText('customNodes.nodeCreator.noResults.description', {
								interpolate: { search: search ? `"${search}"` : '' },
							})
						: i18n.baseText('customNodes.nodeCreator.footer.description')
				}}
			</N8nText>
		</div>
		<N8nButton
			:variant="highlighted ? 'solid' : 'outline'"
			size="small"
			icon="plus"
			:label="i18n.baseText('customNodes.nodeCreator.footer.action')"
			data-test-id="node-creator-create-custom-node"
			@click="openWizard"
		/>
	</div>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.highlighted {
	flex-direction: column;
	text-align: center;
	margin: var(--spacing--md) var(--spacing--sm) var(--spacing--xs);
	padding: var(--spacing--md);
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}

.icon {
	color: var(--color--primary);
	flex: none;
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: var(--spacing--4xs);
	min-width: 0;
}
</style>
