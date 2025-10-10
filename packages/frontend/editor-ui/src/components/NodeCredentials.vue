<script setup lang="ts">
import type { ICredentialsResponse, INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import {
	type ICredentialType,
	type INodeCredentialDescription,
	type INodeCredentialsDetails,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useToast } from '@/composables/useToast';

import TitledList from '@/components/TitledList.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { CREDENTIAL_ONLY_NODE_PREFIX } from '@/constants';
import { ndvEventBus } from '@/event-bus';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { assert } from '@n8n/utils/assert';
import {
	getAuthTypeForNodeCredential,
	getNodeCredentialForSelectedAuthType,
	updateNodeAuthType,
} from '@/utils/nodeTypesUtils';
import { isEmpty } from '@/utils/typesUtils';
import { useNodeCredentialOptions } from '@/composables/useNodeCredentialOptions';

import {
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { injectWorkflowState } from '@/composables/useWorkflowState';
type Props = {
	node: INodeUi;
	overrideCredType?: NodeParameterValueType;
	readonly?: boolean;
	showAll?: boolean;
	hideIssues?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	readonly: false,
	overrideCredType: '',
	showAll: false,
	hideIssues: false,
});

const emit = defineEmits<{
	credentialSelected: [credential: INodeUpdatePropertiesInformation];
	valueChanged: [value: { name: string; value: string }];
	blur: [source: string];
}>();

const telemetry = useTelemetry();
const i18n = useI18n();
const NEW_CREDENTIALS_TEXT = i18n.baseText('nodeCredentials.createNew');

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowState = injectWorkflowState();

const nodeHelpers = useNodeHelpers();
const toast = useToast();

const subscribedToCredentialType = ref('');
const filter = ref('');
const listeningForAuthChange = ref(false);
const selectRefs = ref<Array<InstanceType<typeof N8nSelect>>>([]);

const node = computed(() => props.node);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);

const {
	mainNodeAuthField,
	credentialTypesNodeDescriptionDisplayed,
	credentialTypesNodeDescriptions,
	isCredentialExisting,
	showMixedCredentials,
} = useNodeCredentialOptions(
	node,
	nodeType,
	computed(() => props.overrideCredType),
);

const credentialTypeNames = computed(() => {
	const returnData: Record<string, string> = {};

	for (const { name } of credentialTypesNodeDescriptions.value) {
		const credentialType = credentialsStore.getCredentialTypeByName(name);
		returnData[name] = credentialType ? credentialType.displayName : name;
	}

	return returnData;
});

const selected = computed<Record<string, INodeCredentialsDetails>>(
	() => props.node.credentials ?? {},
);

watch(
	() => props.node.parameters,
	(newValue, oldValue) => {
		// When active node parameters change, check if authentication type has been changed
		// and set `subscribedToCredentialType` to corresponding credential type
		const isActive = props.node.name === ndvStore.activeNode?.name;
		// Only do this for active node and if it's listening for auth change
		if (isActive && nodeType.value && listeningForAuthChange.value) {
			if (mainNodeAuthField.value && oldValue && newValue) {
				const newAuth = newValue[mainNodeAuthField.value.name];

				if (newAuth) {
					const authType =
						typeof newAuth === 'object' ? JSON.stringify(newAuth) : newAuth.toString();
					const credentialType = getNodeCredentialForSelectedAuthType(nodeType.value, authType);
					if (credentialType) {
						subscribedToCredentialType.value = credentialType.name;
					}
				}
			}
		}
	},
	{ immediate: true, deep: true },
);

// Select most recent credential by default
watch(
	credentialTypesNodeDescriptionDisplayed,
	(types) => {
		if (types.length === 0 || !isEmpty(selected.value)) return;

		const allOptions = types.map((type) => type.options).flat();

		if (allOptions.length === 0) return;

		const mostRecentCredential = allOptions.reduce(
			(mostRecent, current) =>
				mostRecent && mostRecent.updatedAt > current.updatedAt ? mostRecent : current,
			allOptions[0],
		);

		onCredentialSelected(mostRecentCredential.type, mostRecentCredential.id);
	},
	{ immediate: true },
);

onMounted(() => {
	credentialsStore.$onAction(({ name, after, args }) => {
		const listeningForActions = ['createNewCredential', 'updateCredential', 'deleteCredential'];
		const credentialType = subscribedToCredentialType.value;
		if (!credentialType) {
			return;
		}

		after(async (result) => {
			if (!listeningForActions.includes(name)) {
				return;
			}
			const current = selected.value[credentialType];
			let credentialsOfType: ICredentialsResponse[] = [];
			if (props.showAll) {
				if (props.node) {
					credentialsOfType = [...(credentialsStore.allUsableCredentialsForNode(props.node) || [])];
				}
			} else {
				credentialsOfType = [
					...(credentialsStore.allUsableCredentialsByType[credentialType] || []),
				];
			}
			switch (name) {
				// new credential was added
				case 'createNewCredential':
					if (result) {
						onCredentialSelected(credentialType, (result as ICredentialsResponse).id);
					}
					break;
				case 'updateCredential':
					const updatedCredential = result as ICredentialsResponse;
					// credential name was changed, update it
					if (updatedCredential.name !== current.name) {
						onCredentialSelected(credentialType, current.id);
					}
					break;
				case 'deleteCredential':
					// all credentials were deleted
					if (credentialsOfType.length === 0) {
						clearSelectedCredential(credentialType);
					} else {
						const id = args[0].id;
						// credential was deleted, select last one added to replace with
						if (current.id === id) {
							onCredentialSelected(
								credentialType,
								credentialsOfType[credentialsOfType.length - 1].id,
							);
						}
					}
					break;
			}
		});
	});

	ndvEventBus.on('credential.createNew', onCreateAndAssignNewCredential);
});

onBeforeUnmount(() => {
	ndvEventBus.off('credential.createNew', onCreateAndAssignNewCredential);
});

function getSelectedId(type: INodeCredentialDescription) {
	if (isCredentialExisting(type)) {
		return selected.value[type.name].id;
	}
	return undefined;
}

function getSelectedName(type: string) {
	return selected.value?.[type]?.name;
}

function getSelectPlaceholder(type: string, issues: string[]) {
	return issues.length && getSelectedName(type)
		? i18n.baseText('nodeCredentials.selectedCredentialUnavailable', {
				interpolate: { name: getSelectedName(type) },
			})
		: i18n.baseText('nodeCredentials.selectCredential');
}

function clearSelectedCredential(credentialType: string) {
	const node = props.node;

	const credentials = {
		...(node.credentials ?? {}),
	};

	delete credentials[credentialType];

	const updateInformation: INodeUpdatePropertiesInformation = {
		name: props.node.name,
		properties: {
			credentials,
		},
	};

	emit('credentialSelected', updateInformation);
}

function createNewCredential(
	credentialType: string,
	listenForAuthChange: boolean = false,
	showAuthOptions = false,
) {
	if (listenForAuthChange) {
		// If new credential dialog is open, start listening for auth type change which should happen in the modal
		// this will be handled in this component's watcher which will set subscribed credential accordingly
		listeningForAuthChange.value = true;
		subscribedToCredentialType.value = credentialType;
	}

	uiStore.openNewCredential(credentialType, showAuthOptions);
	telemetry.track('User opened Credential modal', {
		credential_type: credentialType,
		source: 'node',
		new_credential: true,
		workflow_id: workflowsStore.workflowId,
	});
}

function onCreateAndAssignNewCredential({
	type,
	showAuthOptions,
}: {
	type: string;
	showAuthOptions: boolean;
}) {
	createNewCredential(type, true, showAuthOptions);
}

function onCredentialSelected(
	credentialType: string,
	credentialId: string | null | undefined,
	showAuthOptions = false,
) {
	if (!credentialId) {
		createNewCredential(credentialType, false, showAuthOptions);
		return;
	}

	telemetry.track('User selected credential from node modal', {
		credential_type: credentialType,
		node_type: props.node.type,
		...(nodeHelpers.hasProxyAuth(props.node) ? { is_service_specific: true } : {}),
		workflow_id: workflowsStore.workflowId,
		credential_id: credentialId,
	});

	const selectedCredentials = credentialsStore.getCredentialById(credentialId);
	const selectedCredentialsType = props.showAll ? selectedCredentials.type : credentialType;
	const oldCredentials = props.node.credentials?.[selectedCredentialsType] ?? null;

	const newSelectedCredentials: INodeCredentialsDetails = {
		id: selectedCredentials.id,
		name: selectedCredentials.name,
	};

	// if credentials has been string or neither id matched nor name matched uniquely
	if (
		oldCredentials?.id === null ||
		(oldCredentials?.id &&
			!credentialsStore.getCredentialByIdAndType(oldCredentials.id, selectedCredentialsType))
	) {
		// update all nodes in the workflow with the same old/invalid credentials
		workflowsStore.replaceInvalidWorkflowCredentials({
			credentials: newSelectedCredentials,
			invalid: oldCredentials,
			type: selectedCredentialsType,
		});
		nodeHelpers.updateNodesCredentialsIssues();
		toast.showMessage({
			title: i18n.baseText('nodeCredentials.showMessage.title'),
			message: i18n.baseText('nodeCredentials.showMessage.message', {
				interpolate: {
					oldCredentialName: oldCredentials.name,
					newCredentialName: newSelectedCredentials.name,
				},
			}),
			type: 'success',
		});
	}

	// If credential is selected from mixed credential dropdown, update node's auth filed based on selected credential
	if (props.showAll && mainNodeAuthField.value) {
		const nodeCredentialDescription = nodeType.value?.credentials?.find(
			(cred) => cred.name === selectedCredentialsType,
		);
		const authOption = getAuthTypeForNodeCredential(nodeType.value, nodeCredentialDescription);
		if (authOption) {
			updateNodeAuthType(workflowState, props.node, authOption.value);
			const parameterData = {
				name: `parameters.${mainNodeAuthField.value.name}`,
				value: authOption.value,
			};
			emit('valueChanged', parameterData);
		}
	}

	const node = props.node;

	const credentials = {
		...(node.credentials ?? {}),
		[selectedCredentialsType]: newSelectedCredentials,
	};

	const updateInformation: INodeUpdatePropertiesInformation = {
		name: props.node.name,
		properties: {
			credentials,
		},
	};

	emit('credentialSelected', updateInformation);
}

function getIssues(credentialTypeName: string): string[] {
	const node = props.node;

	if (node.issues?.credentials === undefined) {
		return [];
	}

	if (!node.issues.credentials.hasOwnProperty(credentialTypeName)) {
		return [];
	}
	return node.issues.credentials[credentialTypeName];
}

function editCredential(credentialType: string): void {
	const credential = props.node.credentials?.[credentialType];
	assert(credential?.id);

	uiStore.openExistingCredential(credential.id);

	telemetry.track('User opened Credential modal', {
		credential_type: credentialType,
		source: 'node',
		new_credential: false,
		workflow_id: workflowsStore.workflowId,
	});
	subscribedToCredentialType.value = credentialType;
}

function getCredentialsFieldLabel(credentialType: INodeCredentialDescription): string {
	if (credentialType.displayName) return credentialType.displayName;
	const credentialTypeName = credentialTypeNames.value[credentialType.name];
	const isCredentialOnlyNode = props.node.type.startsWith(CREDENTIAL_ONLY_NODE_PREFIX);

	if (isCredentialOnlyNode) {
		return i18n.baseText('nodeCredentials.credentialFor', {
			interpolate: { credentialType: nodeType.value?.displayName ?? credentialTypeName },
		});
	}

	if (!showMixedCredentials(credentialType)) {
		return i18n.baseText('nodeCredentials.credentialFor', {
			interpolate: { credentialType: credentialTypeName },
		});
	}
	return i18n.baseText('nodeCredentials.credentialsLabel');
}

function setFilter(newFilter = '') {
	filter.value = newFilter;
}

function matches(needle: string, haystack: string) {
	return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

async function onClickCreateCredential(type: ICredentialType | INodeCredentialDescription) {
	selectRefs.value.forEach((select) => select.blur());
	await nextTick();
	createNewCredential(type.name, true, showMixedCredentials(type));
}
</script>

<template>
	<div
		v-if="credentialTypesNodeDescriptionDisplayed.length"
		:class="['node-credentials', $style.container]"
	>
		<div v-for="{ type, options } in credentialTypesNodeDescriptionDisplayed" :key="type.name">
			<N8nInputLabel
				:label="getCredentialsFieldLabel(type)"
				:bold="false"
				size="small"
				color="text-dark"
				data-test-id="credentials-label"
			>
				<div v-if="readonly">
					<N8nInput
						:model-value="getSelectedName(type.name)"
						disabled
						size="small"
						data-test-id="node-credentials-select"
					/>
				</div>
				<div
					v-else
					:class="getIssues(type.name).length && !hideIssues ? $style.hasIssues : $style.input"
					data-test-id="node-credentials-select"
				>
					<N8nSelect
						ref="selectRefs"
						:model-value="getSelectedId(type)"
						:placeholder="getSelectPlaceholder(type.name, getIssues(type.name))"
						size="small"
						filterable
						:filter-method="setFilter"
						:popper-class="$style.selectPopper"
						@update:model-value="
							(value: string) => onCredentialSelected(type.name, value, showMixedCredentials(type))
						"
						@blur="emit('blur', 'credentials')"
					>
						<N8nOption
							v-for="item in options.filter((o) => matches(filter, o.name))"
							:key="item.id"
							:data-test-id="`node-credentials-select-item-${item.id}`"
							:label="item.name"
							:value="item.id"
						>
							<div :class="[$style.credentialOption, 'mt-2xs', 'mb-2xs']">
								<N8nText bold>{{ item.name }}</N8nText>
								<N8nText size="small">{{ item.typeDisplayName }}</N8nText>
							</div>
						</N8nOption>
						<template #empty> </template>
						<template #footer>
							<div
								data-test-id="node-credentials-select-item-new"
								:class="['clickable', $style.newCredential]"
								@click="onClickCreateCredential(type)"
							>
								<N8nIcon size="xsmall" icon="plus" />
								<N8nText bold>{{ NEW_CREDENTIALS_TEXT }}</N8nText>
							</div>
						</template>
					</N8nSelect>

					<div v-if="getIssues(type.name).length && !hideIssues" :class="$style.warning">
						<N8nTooltip placement="top">
							<template #content>
								<TitledList
									:title="`${i18n.baseText('nodeCredentials.issues')}:`"
									:items="getIssues(type.name)"
								/>
							</template>
							<N8nIcon icon="triangle-alert" />
						</N8nTooltip>
					</div>

					<div
						v-if="selected[type.name] && isCredentialExisting(type)"
						:class="$style.edit"
						data-test-id="credential-edit-button"
					>
						<N8nIcon
							icon="pen"
							class="clickable"
							:title="i18n.baseText('nodeCredentials.updateCredential')"
							@click="editCredential(type.name)"
						/>
					</div>
				</div>
			</N8nInputLabel>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	margin-top: var(--spacing--xs);

	& > div:not(:first-child) {
		margin-top: var(--spacing--xs);
	}
}

.selectPopper {
	:global(.el-select-dropdown__list) {
		padding: 0;
	}

	:has(.newCredential:hover) :global(.hover) {
		background-color: transparent;
	}

	&:not(:has(li)) .newCredential {
		border-top: none;
		box-shadow: none;
		border-radius: var(--radius);
	}
}

.warning {
	margin-left: var(--spacing--4xs);
	color: var(--color--danger--tint-1);
	font-size: var(--font-size--sm);
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color--text);
	margin-left: var(--spacing--3xs);
	font-size: var(--font-size--sm);
}

.input {
	display: flex;
	align-items: center;
}

.hasIssues {
	composes: input;
	--input-border-color: var(--color--danger);
}

.credentialOption {
	display: flex;
	flex-direction: column;
}

.newCredential {
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--color--background--light-2);

	border-top: var(--border);
	box-shadow: var(--shadow--light);
	clip-path: inset(-12px 0 0 0); // Only show box shadow on top

	&:hover {
		color: var(--color--primary);
	}
}
</style>
