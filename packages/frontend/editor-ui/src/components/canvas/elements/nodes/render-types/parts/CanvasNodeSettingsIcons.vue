<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useI18n } from '@n8n/i18n';
import SettingIcon from '@/components/canvas/elements/nodes/render-types/parts/SettingIcon.vue';

const { name } = useCanvasNode();
const i18n = useI18n();
const workflowHelpers = useWorkflowHelpers();

const workflow = computed(() => workflowHelpers.getCurrentWorkflow());
const node = computed(() => workflow.value.getNode(name.value));
</script>

<template>
	<div :class="$style.settingIcons">
		<N8nTooltip v-if="node?.alwaysOutputData">
			<template #content>
				<div :class="$style.tooltipHeader">
					<SettingIcon setting="alwaysOutputData" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.alwaysOutputData.displayName')
					}}</strong>
				</div>
				<div :class="$style.tooltipText">
					{{ i18n.baseText('node.settings.alwaysOutputData') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-always-output-data" :class="$style.settingIcon">
				<SettingIcon setting="alwaysOutputData" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="node?.executeOnce">
			<template #content>
				<div :class="$style.tooltipHeader">
					<SettingIcon setting="executeOnce" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.executeOnce.displayName')
					}}</strong>
				</div>
				<div :class="$style.tooltipText">
					{{ i18n.baseText('node.settings.executeOnce') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-execute-once" :class="$style.settingIcon">
				<SettingIcon setting="executeOnce" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="node?.retryOnFail">
			<template #content>
				<div :class="$style.tooltipHeader">
					<SettingIcon setting="retryOnFail" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.retryOnFail.displayName')
					}}</strong>
				</div>
				<div :class="$style.tooltipText">
					{{ i18n.baseText('node.settings.retriesOnFailure') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-retry-on-fail" :class="$style.settingIcon">
				<SettingIcon setting="retryOnFail" />
			</div>
		</N8nTooltip>

		<N8nTooltip
			v-if="node?.onError === 'continueRegularOutput' || node?.onError === 'continueErrorOutput'"
		>
			<template #content>
				<div :class="$style.tooltipHeader">
					<SettingIcon setting="continueOnError" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('node.settings.continuesOnError.title')
					}}</strong>
				</div>
				<div :class="$style.tooltipText">
					{{ i18n.baseText('node.settings.continuesOnError') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-continue-on-error" :class="$style.settingIcon">
				<SettingIcon setting="continueOnError" />
			</div>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.settingIcons {
	display: flex;
	flex-direction: row;
	gap: var(--spacing-m);
}

.settingIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-light);
}

.tooltipHeader {
	display: flex;
	align-items: baseline;
	gap: 6px;
	margin-bottom: 1px;
}

.tooltipHeader svg {
	transform: translateY(-1px);
}

.tooltipTitle {
	font-weight: 600;
	font-size: inherit;
	line-height: inherit;
}

.tooltipText {
	font-size: inherit;
	line-height: inherit;
}
</style>
