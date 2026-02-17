<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import SetupCredentialLabel from './SetupCredentialLabel.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSetupPanelStore } from '../setupPanel.store';

import type { NodeCredentialRequirement, NodeSetupState } from '../setupPanel.types';
import { useNodeExecution } from '@/app/composables/useNodeExecution';
import { useTelemetry } from '@/app/composables/useTelemetry';

const props = withDefaults(
	defineProps<{
		state: NodeSetupState;
		loading?: boolean;
	}>(),
	{ loading: false },
);

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string }];
	credentialDeselected: [credentialType: string];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const setupPanelStore = useSetupPanelStore();

const nodeRef = computed(() => props.state.node);
const { isExecuting, buttonLabel, buttonIcon, disabledReason, hasIssues, execute } =
	useNodeExecution(nodeRef);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

// For triggers: button is disabled if node has issues, is executing, or there's a disabledReason
const isButtonDisabled = computed(
	() => isExecuting.value || hasIssues.value || !!disabledReason.value,
);

const showFooter = computed(() => props.state.isTrigger || props.state.isComplete);

const tooltipText = computed(() => {
	if (hasIssues.value) {
		return i18n.baseText('ndv.execute.requiredFieldsMissing');
	}
	return disabledReason.value;
});

const onCardMouseEnter = () => {
	setupPanelStore.setHighlightedNodes([props.state.node.id]);
};

const onSharedNodesHintEnter = (requirement: NodeCredentialRequirement) => {
	const ids: string[] = [props.state.node.id];
	for (const name of requirement.nodesWithSameCredential) {
		const node = workflowsStore.getNodeByName(name);
		if (node) ids.push(node.id);
	}
	setupPanelStore.setHighlightedNodes(ids);
};

const onSharedNodesHintLeave = () => {
	setupPanelStore.setHighlightedNodes([props.state.node.id]);
};

const onCardMouseLeave = () => {
	setupPanelStore.clearHighlightedNodes();
};

const onHeaderClick = () => {
	expanded.value = !expanded.value;
};

// Tracks whether the user directly interacted with this card (credential select/deselect or test click).
// Used to avoid firing telemetry for cards that were auto-completed via credential auto-assignment.
const hadManualInteraction = ref(false);

const onCredentialSelected = (credentialType: string, credentialId: string) => {
	hadManualInteraction.value = true;
	emit('credentialSelected', { credentialType, credentialId });
};

const onCredentialDeselected = (credentialType: string) => {
	hadManualInteraction.value = true;
	emit('credentialDeselected', credentialType);
};

const onTestClick = async () => {
	hadManualInteraction.value = true;
	await execute();
};

function collectNodeTypesFromRequirements(
	requirements: Array<{ nodesWithSameCredential: string[] }>,
) {
	const types = new Set<string>();

	for (const req of requirements) {
		for (const nodeName of req.nodesWithSameCredential) {
			const node = workflowsStore.getNodeByName(nodeName);
			if (node) types.add(node.type);
		}
	}

	return types;
}

function countRelatedNodes(requirements: Array<{ nodesWithSameCredential: string[] }>) {
	let count = 0;
	for (const req of requirements) count += req.nodesWithSameCredential.length;
	return count;
}

watch(
	() => props.state.isComplete,
	(isComplete) => {
		if (isComplete) {
			expanded.value = false;

			if (hadManualInteraction.value) {
				telemetry.track('User completed setup step', {
					template_id: workflowsStore.workflow.meta?.templateId,
					workflow_id: workflowsStore.workflowId,
					type: props.state.isTrigger ? 'trigger' : 'credential',
					nodes: Array.from(collectNodeTypesFromRequirements(props.state.credentialRequirements)),
					related_nodes_count: countRelatedNodes(props.state.credentialRequirements),
				});
				hadManualInteraction.value = false;
			}
		}
	},
);

onMounted(() => {
	if (props.state.isComplete) {
		expanded.value = false;
	}
});

onBeforeUnmount(() => {
	setupPanelStore.clearHighlightedNodes();
});
</script>

<template>
	<div
		data-test-id="node-setup-card"
		:class="[
			$style.card,
			{
				[$style.collapsed]: !expanded,
				[$style.completed]: state.isComplete && !loading,
				[$style['no-content']]: !state.credentialRequirements.length,
			},
		]"
		@mouseenter="onCardMouseEnter"
		@mouseleave="onCardMouseLeave"
	>
		<header data-test-id="node-setup-card-header" :class="$style.header" @click="onHeaderClick">
			<N8nIcon
				v-if="!expanded && loading"
				icon="spinner"
				:class="$style['loading-icon']"
				size="medium"
				spin
			/>
			<N8nIcon
				v-else-if="!expanded && state.isComplete"
				data-test-id="node-setup-card-complete-icon"
				icon="check"
				:class="$style['complete-icon']"
				size="medium"
			/>
			<NodeIcon v-else :node-type="nodeType" :size="16" />
			<N8nText :class="$style['node-name']" size="medium" color="text-dark">
				{{ props.state.node.name }}
			</N8nText>
			<N8nTooltip v-if="state.isTrigger">
				<template #content>
					{{ i18n.baseText('nodeCreator.nodeItem.triggerIconTitle') }}
				</template>
				<N8nIcon
					:class="[$style['header-icon'], $style['trigger']]"
					icon="zap"
					size="small"
					color="text-light"
				/>
			</N8nTooltip>
			<N8nIcon
				:class="[$style['header-icon'], $style['chevron']]"
				:icon="expanded ? 'chevrons-down-up' : 'chevrons-up-down'"
				size="medium"
				color="text-light"
			/>
		</header>

		<template v-if="expanded">
			<div
				v-if="state.credentialRequirements.length"
				:class="{ [$style.content]: true, ['pb-s']: !showFooter }"
			>
				<N8nText v-if="state.isTrigger" size="medium" color="text-light" class="mb-3xs">
					{{ i18n.baseText('setupPanel.trigger.credential.note') }}
				</N8nText>
				<div
					v-for="requirement in state.credentialRequirements"
					:key="requirement.credentialType"
					:class="$style['credential-container']"
				>
					<SetupCredentialLabel
						:node-name="state.node.name"
						:credential-type="requirement.credentialType"
						:nodes-with-same-credential="requirement.nodesWithSameCredential"
						@hint-mouse-enter="onSharedNodesHintEnter(requirement)"
						@hint-mouse-leave="onSharedNodesHintLeave"
					/>
					<CredentialPicker
						create-button-type="secondary"
						:class="$style['credential-picker']"
						:app-name="requirement.credentialDisplayName"
						:credential-type="requirement.credentialType"
						:selected-credential-id="requirement.selectedCredentialId ?? null"
						@credential-selected="onCredentialSelected(requirement.credentialType, $event)"
						@credential-deselected="onCredentialDeselected(requirement.credentialType)"
					/>
				</div>
			</div>

			<footer v-if="showFooter" :class="$style.footer">
				<div v-if="state.isComplete" :class="$style['footer-complete-check']">
					<N8nIcon icon="check" :class="$style['complete-icon']" size="large" />
					<N8nText size="medium" color="success">
						{{ i18n.baseText('generic.complete') }}
					</N8nText>
				</div>
				<N8nTooltip v-if="state.isTrigger" :disabled="!tooltipText" placement="top">
					<template #content>{{ tooltipText }}</template>
					<N8nButton
						data-test-id="node-setup-card-test-button"
						:label="buttonLabel"
						:disabled="isButtonDisabled"
						:loading="isExecuting"
						:icon="buttonIcon"
						size="small"
						@click="onTestClick"
					/>
				</N8nTooltip>
			</footer>
		</template>
	</div>
</template>

<style module lang="scss">
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);

	.header-icon {
		&.chevron {
			display: none;
		}
	}

	&:hover {
		.header-icon {
			&.chevron {
				display: block;
			}
			&.trigger {
				display: none;
			}
		}
	}
}

.header {
	display: flex;
	gap: var(--spacing--xs);
	cursor: pointer;
	user-select: none;
	padding: var(--spacing--sm) var(--spacing--sm) 0;

	.card:not(.collapsed) & {
		margin-bottom: var(--spacing--sm);
	}

	.card.no-content & {
		margin-bottom: 0;
	}
}

.node-name {
	flex: 1;
	font-weight: var(--font-weight--medium);
}

.complete-icon {
	color: var(--color--success);
}

.loading-icon {
	color: var(--color--text--tint-2);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm);
}

.credential-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.credential-picker {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing--sm);
}

.footer-complete-check {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.card.collapsed {
	.header {
		padding: var(--spacing--sm);
	}

	.node-name {
		color: var(--color--text--tint-1);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.card.completed {
	border-color: var(--color--success);

	.footer {
		justify-content: space-between;
	}
}
</style>
