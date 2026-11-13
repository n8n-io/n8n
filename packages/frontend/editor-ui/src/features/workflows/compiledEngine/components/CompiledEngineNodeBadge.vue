<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useCompiledEngineStore } from '../compiledEngine.store';
import type { CompiledNodeRunMode } from '../compiledEngine.types';
import { useCompiledEngineWorkflow } from '../composables/useCompiledEngineWorkflow';

const props = defineProps<{ nodeName: string }>();

const i18n = useI18n();
const compiledEngineStore = useCompiledEngineStore();
const { isCompiledWorkflow, workflowId } = useCompiledEngineWorkflow();

const runMode = computed(() =>
	isCompiledWorkflow.value
		? compiledEngineStore.getNodeRunMode(workflowId.value, props.nodeName)
		: undefined,
);
const errors = computed(() =>
	isCompiledWorkflow.value
		? compiledEngineStore
				.getNodeDiagnostics(workflowId.value, props.nodeName)
				.filter((d) => d.severity === 'error')
		: [],
);
const hasError = computed(() => errors.value.length > 0);
const isVisible = computed(() => runMode.value !== undefined || hasError.value);

const runModeIcon: Record<CompiledNodeRunMode, IconName> = {
	native: 'zap',
	code: 'code',
	host: 'server',
};

const icon = computed((): IconName => {
	if (hasError.value) return 'circle-x';
	return runMode.value ? runModeIcon[runMode.value] : 'zap';
});
</script>

<template>
	<N8nTooltip v-if="isVisible" placement="bottom">
		<template #content>
			<div :class="$style.tooltip">
				<template v-if="runMode">
					<strong>{{ i18n.baseText(`compiledEngine.runMode.${runMode}`) }}</strong>
					<span>{{ i18n.baseText(`compiledEngine.runMode.${runMode}.description`) }}</span>
				</template>
				<template v-if="hasError">
					<strong>{{ i18n.baseText('compiledEngine.node.doesNotCompile') }}</strong>
					<span v-for="(error, index) in errors" :key="index">{{ error.message }}</span>
				</template>
			</div>
		</template>
		<div
			:class="[$style.badge, { [$style.error]: hasError }]"
			:data-run-mode="runMode"
			data-test-id="compiled-engine-node-badge"
		>
			<N8nIcon :icon="icon" size="xsmall" />
		</div>
	</N8nTooltip>
</template>

<style lang="scss" module>
.badge {
	position: absolute;
	bottom: var(--canvas-node--status-icons--margin, var(--spacing--3xs));
	left: var(--canvas-node--status-icons--margin, var(--spacing--3xs));
	display: grid;
	place-items: center;
	color: var(--text-color--subtle);

	&.error {
		color: var(--icon-color--danger);
	}
}

.tooltip {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
</style>
