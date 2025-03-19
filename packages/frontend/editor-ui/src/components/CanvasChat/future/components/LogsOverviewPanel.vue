<script setup lang="ts">
import PanelHeader from '@/components/CanvasChat/components/PanelHeader.vue';
import { useClearExecutionButtonVisible } from '@/composables/useClearExecutionButtonVisible';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';

defineProps<{ isOpen: boolean }>();

const emit = defineEmits<{ clickHeader: [] }>();
const locale = useI18n();
const workflowsStore = useWorkflowsStore();
const nodeHelpers = useNodeHelpers();
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();

defineSlots<{ actions: {} }>();

function onClearExecutionData() {
	workflowsStore.setWorkflowExecutionData(null);
	nodeHelpers.updateNodesExecutionIssues();
}
</script>

<template>
	<div :class="$style.container">
		<PanelHeader
			:title="locale.baseText('logs.overview.header.title')"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip
					v-if="isClearExecutionButtonVisible"
					:content="locale.baseText('logs.overview.header.actions.clearExecution.tooltip')"
				>
					<N8nButton
						size="mini"
						type="secondary"
						icon="trash"
						icon-size="medium"
						@click.stop="onClearExecutionData"
						>{{ locale.baseText('logs.overview.header.actions.clearExecution') }}</N8nButton
					>
				</N8nTooltip>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="[$style.content, $style.empty]">
			<N8nText tag="p" size="medium" color="text-base" :class="$style.emptyText">
				{{ locale.baseText('logs.overview.body.empty.message') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.content {
	padding: var(--spacing-2xs);
	flex-grow: 1;

	&.empty {
		display: flex;
		align-items: center;
		justify-content: center;
	}
}

.emptyText {
	max-width: 20em;
	text-align: center;
}
</style>
