<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasNode } from '../../../../../composables/useCanvasNode';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
const { name } = useCanvasNode();
const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const { check: checkEnvFeatureFlag } = useEnvFeatureFlag();

const isDynamicCredentialsEnabled = computed(() =>
	checkEnvFeatureFlag.value('DYNAMIC_CREDENTIALS'),
);

const node = computed(() => workflowsStore.workflowObject.getNode(name.value));
const size = 'medium';

const hasResolvableCredential = computed(() => {
	const nodeCredentials = node.value?.credentials;
	if (!nodeCredentials) return false;

	return Object.values(nodeCredentials).some((cred) => {
		if (!cred?.id) return false;
		const credential = credentialsStore.getCredentialById(cred.id);
		return credential?.isResolvable === true;
	});
});

const hasContextEstablishmentHooks = computed(() => {
	const contextEstablishment = node.value?.parameters?.contextEstablishmentHooks;
	if (
		typeof contextEstablishment !== 'object' ||
		contextEstablishment === null ||
		!('hooks' in contextEstablishment)
	) {
		return false;
	}
	const hooks = contextEstablishment.hooks;
	return Array.isArray(hooks) && hooks.length > 0;
});

const hasDynamicCredentials = computed(
	() => hasResolvableCredential.value || hasContextEstablishmentHooks.value,
);
</script>

<template>
	<div :class="$style.settingsIcons">
		<N8nTooltip v-if="node?.alwaysOutputData">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="always-output-data" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.alwaysOutputData.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.alwaysOutputData') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-always-output-data">
				<N8nIcon icon="always-output-data" :size="size" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="node?.executeOnce">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="execute-once" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.executeOnce.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.executeOnce') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-execute-once">
				<N8nIcon icon="execute-once" :size="size" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="node?.retryOnFail">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="retry-on-fail" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.retryOnFail.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.retriesOnFailure') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-retry-on-fail">
				<N8nIcon icon="retry-on-fail" :size="size" />
			</div>
		</N8nTooltip>

		<N8nTooltip
			v-if="node?.onError === 'continueRegularOutput' || node?.onError === 'continueErrorOutput'"
		>
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="continue-on-error" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('node.settings.continuesOnError.title')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.continuesOnError') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-continue-on-error">
				<N8nIcon icon="continue-on-error" :size="size" />
			</div>
		</N8nTooltip>

		<N8nTooltip v-if="isDynamicCredentialsEnabled && hasDynamicCredentials">
			<template #content>
				<div :class="$style.tooltipHeader">
					<N8nIcon icon="key-round" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.dynamicCredentials.displayName')
					}}</strong>
				</div>
				<div>
					{{
						i18n.baseText(
							hasContextEstablishmentHooks
								? 'node.settings.contextEstablishmentHooks'
								: 'node.settings.dynamicCredentials',
						)
					}}
				</div>
			</template>
			<div data-test-id="canvas-node-status-dynamic-credentials">
				<N8nIcon icon="key-round" :size="size" />
			</div>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.settingsIcons {
	position: absolute;
	top: var(--canvas-node--status-icons--margin);
	right: var(--canvas-node--status-icons--margin);
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
