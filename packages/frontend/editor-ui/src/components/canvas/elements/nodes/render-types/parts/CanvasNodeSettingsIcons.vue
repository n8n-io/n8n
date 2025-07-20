<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';

const { name } = useCanvasNode();
const i18n = useI18n();
const workflowHelpers = useWorkflowHelpers();

const workflow = computed(() => workflowHelpers.getCurrentWorkflow());
const node = computed(() => workflow.value.getNode(name.value));
</script>

<template>
	<div :class="$style.settingsIcons">
		<N8nTooltip v-if="node?.alwaysOutputData">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="always-output-data" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.alwaysOutputData.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.alwaysOutputData') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-always-output-data">
				<N8nIcon icon="always-output-data" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="node?.executeOnce">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="execute-once" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.executeOnce.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.executeOnce') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-execute-once">
				<N8nIcon icon="execute-once" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="node?.retryOnFail">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="retry-on-fail" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.retryOnFail.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.retriesOnFailure') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-retry-on-fail">
				<N8nIcon icon="retry-on-fail" />
			</div>
		</N8nTooltip>

		<N8nTooltip
			v-if="node?.onError === 'continueRegularOutput' || node?.onError === 'continueErrorOutput'"
		>
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="continue-on-error" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('node.settings.continuesOnError.title')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.continuesOnError') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-continue-on-error">
				<N8nIcon icon="continue-on-error" />
			</div>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.settingsIcons {
	position: absolute;
	top: var(--canvas-node--status-icons-offset);
	right: var(--canvas-node--status-icons-offset);
	display: flex;
	flex-direction: row;
}
.tooltipHeader {
	display: flex;
	gap: 2px;
}

.tooltipTitle {
	font-weight: 600;
	font-size: inherit;
	line-height: inherit;
}
</style>
