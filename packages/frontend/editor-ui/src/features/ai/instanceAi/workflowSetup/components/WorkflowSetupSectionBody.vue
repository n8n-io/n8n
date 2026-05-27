<script lang="ts" setup>
import { computed, provide, ref, watch } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { ExpressionLocalResolveContextSymbol, WorkflowDocumentStoreKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { findPlaceholderDetails } from '@n8n/utils';
import type { INodeProperties } from 'n8n-workflow';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const props = withDefaults(
	defineProps<{
		section: WorkflowSetupSection;
		hideCredential?: boolean;
		hideHelper?: boolean;
		helperTextOverride?: string;
		credentialSections?: WorkflowSetupSection[];
		parameterSections?: WorkflowSetupSection[];
	}>(),
	{
		hideCredential: false,
		hideHelper: false,
		helperTextOverride: undefined,
		credentialSections: undefined,
		parameterSections: undefined,
	},
);

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const credentialType = computed(() => props.section.credentialType);
const shouldShowCredential = computed(() => !!credentialType.value && !props.hideCredential);

const credentialOwnerSections = computed(() => {
	const sections = props.credentialSections?.length ? props.credentialSections : [props.section];
	const byId = new Map<string, WorkflowSetupSection>();
	for (const section of sections) {
		byId.set(section.id, section);
	}
	return [...byId.values()];
});

const parameterOwnerSections = computed(() => {
	const sections = props.parameterSections?.length ? props.parameterSections : [props.section];
	const byId = new Map<string, WorkflowSetupSection>();
	for (const section of sections) {
		byId.set(section.id, section);
	}
	return [...byId.values()];
});

const credentialAppName = computed(() => {
	const type = credentialType.value;
	if (!type) return undefined;

	const raw = credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
	return getAppNameFromCredType(raw);
});

const selectedCredentialId = computed(() => {
	const type = credentialType.value;
	if (!type) return null;

	for (const section of credentialOwnerSections.value) {
		for (const target of section.credentialTargetNodes) {
			const credentialId = ctx.credentialSelections.value[target.name]?.[type];
			if (credentialId) return credentialId;
		}

		const credentialId = ctx.credentialSelections.value[section.targetNodeName]?.[type];
		if (credentialId) return credentialId;
	}

	return null;
});

const selectedCredentials = computed<INodeUi['credentials']>(() => {
	const type = credentialType.value;
	if (!type) return undefined;

	const cred = selectedCredentialId.value
		? credentialsStore.getCredentialById(selectedCredentialId.value)
		: undefined;

	return cred ? { [type]: { id: cred.id, name: cred.name } } : {};
});

const credentialTargetNodes = computed(() => {
	const byName = new Map<string, WorkflowSetupSection['credentialTargetNodes'][number]>();
	for (const section of credentialOwnerSections.value) {
		for (const target of section.credentialTargetNodes) {
			byName.set(target.name, target);
		}
	}
	return [...byName.values()];
});
const targetNodeNames = computed(() => credentialTargetNodes.value.map((node) => node.name));
const targetNodeNamesTooltip = computed(() => targetNodeNames.value.join(', '));
const usedByNodesLabel = computed(() =>
	i18n.baseText('instanceAi.workflowSetup.usedByNodes', {
		adjustToNumber: targetNodeNames.value.length,
		interpolate: { count: targetNodeNames.value.length },
	}),
);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.section.node.type, props.section.node.typeVersion),
);

const parameterDefinitions = computed<INodeProperties[]>(() => {
	if (!nodeType.value || props.section.parameterNames.length === 0) return [];
	const names = new Set(props.section.parameterNames);
	return nodeType.value.properties.filter((property) => names.has(property.name));
});

const revealedIssues = ref(new Set<string>());

watch(
	() => props.section.id,
	() => {
		revealedIssues.value = new Set();
	},
);

const hiddenIssuesInputs = computed(() =>
	parameterDefinitions.value
		.filter((param) => !revealedIssues.value.has(param.name))
		.map((param) => param.name),
);

function revealParameterIssues(parameterName: string) {
	revealedIssues.value.add(parameterName);
}

function getRootParameterName(parameterName: string) {
	return parameterName.split(/[.[\]]/)[0] ?? parameterName;
}

const displayNode = computed<INodeUi>(() => {
	const node = ctx.getDisplayNode(props.section);
	if (!credentialType.value) return node;
	return {
		...node,
		credentials: selectedCredentials.value,
	} as INodeUi;
});

const hasPlaceholderParameters = computed(() =>
	props.section.parameterNames.some(
		(parameterName) =>
			findPlaceholderDetails(props.section.node.parameters[parameterName]).length > 0,
	),
);

const helperText = computed(() => {
	if (props.hideHelper) return '';
	if (props.helperTextOverride !== undefined) return props.helperTextOverride;

	const hasCredential = shouldShowCredential.value;
	const hasParameters = parameterDefinitions.value.length > 0;

	if (hasCredential && hasParameters && credentialAppName.value) {
		return i18n.baseText('instanceAi.workflowSetup.credentialAndParameterHelp' as BaseTextKey, {
			interpolate: { name: credentialAppName.value },
		});
	}

	if (hasCredential && credentialAppName.value) {
		return i18n.baseText('instanceAi.workflowSetup.credentialHelp' as BaseTextKey, {
			interpolate: { name: credentialAppName.value },
		});
	}

	if (hasParameters && hasPlaceholderParameters.value) {
		return i18n.baseText('instanceAi.workflowSetup.placeholderHelp' as BaseTextKey);
	}

	if (hasParameters) {
		return i18n.baseText('instanceAi.workflowSetup.parameterHelp' as BaseTextKey);
	}

	return '';
});

const workflowDocumentStore = computed(() =>
	useWorkflowDocumentStore(
		createWorkflowDocumentId(
			ctx.workflowId.value ?? 'instance-ai-workflow-setup',
			props.section.id,
		),
	),
);

watch(
	displayNode,
	(node) => {
		workflowDocumentStore.value.setNodes([node]);
	},
	{ immediate: true, deep: true },
);

const expressionContext = computed<ExpressionLocalResolveContext | undefined>(() => ({
	localResolve: true,
	nodeName: displayNode.value.name,
	additionalKeys: {},
}));

provide(ExpressionLocalResolveContextSymbol, expressionContext);
provide(WorkflowDocumentStoreKey, workflowDocumentStore);

function onCredentialSelected(update: INodeUpdatePropertiesInformation) {
	if (!credentialType.value) return;
	const data = update.properties.credentials?.[credentialType.value];
	for (const section of credentialOwnerSections.value) {
		ctx.setCredential(section, data?.id ?? null);
	}
}

function onParameterValueChanged(update: IUpdateInformation) {
	const parameterName = update.name.replace(/^parameters\./, '');
	const rootParameterName = getRootParameterName(parameterName);

	for (const section of parameterOwnerSections.value) {
		if (!section.parameterNames.includes(rootParameterName)) continue;
		ctx.setParameterValue(section, parameterName, update.value);
	}

	revealParameterIssues(rootParameterName);
}
</script>

<template>
	<div :class="$style.body">
		<N8nText
			v-if="helperText"
			:class="$style.helperText"
			size="small"
			color="text-base"
			data-test-id="instance-ai-workflow-setup-helper"
		>
			{{ helperText }}
		</N8nText>

		<NodeCredentials
			v-if="shouldShowCredential"
			:node="displayNode"
			:override-cred-type="credentialType"
			:project-id="ctx.projectId.value"
			standalone
			hide-issues
			hide-ask-assistant
			:hide-credential-service-name-in-label="true"
			:hide-empty-credential-select="true"
			@credential-selected="onCredentialSelected"
		>
			<template v-if="credentialTargetNodes.length > 1" #label-postfix>
				<N8nTooltip placement="top">
					<template #content>{{ targetNodeNamesTooltip }}</template>
					<N8nText
						size="small"
						color="text-light"
						data-test-id="instance-ai-workflow-setup-card-nodes-hint"
					>
						{{ usedByNodesLabel }}
					</N8nText>
				</N8nTooltip>
			</template>
		</NodeCredentials>

		<div
			v-if="parameterDefinitions.length > 0"
			:class="$style.parameters"
			data-test-id="instance-ai-workflow-setup-parameters"
		>
			<ParameterInputList
				:parameters="parameterDefinitions"
				:node-values="{ parameters: displayNode.parameters }"
				:node="displayNode"
				path="parameters"
				:hide-delete="true"
				:hidden-issues-inputs="hiddenIssuesInputs"
				:remove-first-parameter-margin="true"
				:remove-last-parameter-margin="true"
				:options-overrides="{
					hideExpressionSelector: true,
					hideFocusPanelButton: true,
					hideParameterOptions: true,
				}"
				@value-changed="onParameterValueChanged"
				@parameter-blur="revealParameterIssues"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	:global(.node-credentials) {
		margin-top: 0;
	}

	:global(label.n8n-input-label > div:first-child .n8n-text) {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	:global([data-test-id='input-label']),
	:global([data-test-id='credentials-label']) {
		display: grid;
		grid-template-columns: minmax(10rem, 32%) minmax(0, 1fr);
		column-gap: var(--spacing--sm);
		align-items: start;
	}

	:global([data-test-id='input-label'] > div:first-child),
	:global([data-test-id='credentials-label'] > div:first-child) {
		grid-column: 1;
		min-width: 0;
		padding-top: var(--spacing--3xs);
	}

	:global([data-test-id='input-label'] > *:not(:first-child)),
	:global([data-test-id='credentials-label'] > *:not(:first-child)) {
		grid-column: 2;
		min-width: 0;
	}

	:global([data-test-id='credentials-label'] > *:not(:first-child)) {
		margin-top: 0;
	}

	:global([data-test-id='input-label'] input),
	:global([data-test-id='input-label'] .el-input__inner),
	:global([data-test-id='input-label'] .el-input__wrapper),
	:global([data-test-id='input-label'] .el-select),
	:global([data-test-id='credentials-label'] button) {
		font-size: var(--font-size--sm);
	}
}

.parameters {
	display: flex;
	flex-direction: column;
}

.helperText {
	padding-bottom: var(--spacing--5xs);
}

@media (max-width: 40rem) {
	.body {
		:global([data-test-id='input-label']),
		:global([data-test-id='credentials-label']) {
			grid-template-columns: 1fr;
			row-gap: var(--spacing--3xs);
		}

		:global([data-test-id='input-label'] > div:first-child),
		:global([data-test-id='credentials-label'] > div:first-child),
		:global([data-test-id='input-label'] > *:not(:first-child)),
		:global([data-test-id='credentials-label'] > *:not(:first-child)) {
			grid-column: 1;
			padding-top: 0;
		}
	}
}
</style>
