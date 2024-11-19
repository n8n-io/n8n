<script setup lang="ts">
import type { ICredentialsResponse, INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type {
	INodeCredentialDescription,
	INodeCredentialsDetails,
	NodeParameterValueType,
} from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useToast } from '@/composables/useToast';

import TitledList from '@/components/TitledList.vue';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { CREDENTIAL_ONLY_NODE_PREFIX, KEEP_AUTH_IN_NDV_FOR_NODES } from '@/constants';
import { ndvEventBus } from '@/event-bus';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { assert } from '@/utils/assert';
import {
	getAllNodeCredentialForAuthType,
	getAuthTypeForNodeCredential,
	getMainAuthField,
	getNodeCredentialForSelectedAuthType,
	isRequiredCredential,
	updateNodeAuthType,
} from '@/utils/nodeTypesUtils';
import {
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from 'n8n-design-system';
import { isEmpty } from '@/utils/typesUtils';

interface CredentialDropdownOption extends ICredentialsResponse {
	typeDisplayName: string;
}

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
const NEW_CREDENTIALS_TEXT = `- ${i18n.baseText('nodeCredentials.createNew')} -`;

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const nodeHelpers = useNodeHelpers();
const toast = useToast();

const subscribedToCredentialType = ref('');
const listeningForAuthChange = ref(false);

const credentialTypesNode = computed(() =>
	credentialTypesNodeDescription.value.map(
		(credentialTypeDescription) => credentialTypeDescription.name,
	),
);

const credentialTypesNodeDescriptionDisplayed = computed(() =>
	credentialTypesNodeDescription.value
		.filter((credentialTypeDescription) => displayCredentials(credentialTypeDescription))
		.map((type) => ({ type, options: getCredentialOptions(getAllRelatedCredentialTypes(type)) })),
);
const credentialTypesNodeDescription = computed(() => {
	if (typeof props.overrideCredType !== 'string') return [];

	const credType = credentialsStore.getCredentialTypeByName(props.overrideCredType);

	if (credType) return [credType];

	const activeNodeType = nodeType.value;
	if (activeNodeType?.credentials) {
		return activeNodeType.credentials;
	}

	return [];
});

const credentialTypeNames = computed(() => {
	const returnData: Record<string, string> = {};
	for (const credentialTypeName of credentialTypesNode.value) {
		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		returnData[credentialTypeName] = credentialType
			? credentialType.displayName
			: credentialTypeName;
	}
	return returnData;
});

const selected = computed<Record<string, INodeCredentialsDetails>>(
	() => props.node.credentials ?? {},
);
const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);
const mainNodeAuthField = computed(() => getMainAuthField(nodeType.value));
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

function getAllRelatedCredentialTypes(credentialType: INodeCredentialDescription): string[] {
	const credentialIsRequired = showMixedCredentials(credentialType);
	if (credentialIsRequired) {
		if (mainNodeAuthField.value) {
			const credentials = getAllNodeCredentialForAuthType(
				nodeType.value,
				mainNodeAuthField.value.name,
			);
			return credentials.map((cred) => cred.name);
		}
	}
	return [credentialType.name];
}

function getCredentialOptions(types: string[]): CredentialDropdownOption[] {
	let options: CredentialDropdownOption[] = [];
	types.forEach((type) => {
		options = options.concat(
			credentialsStore.allUsableCredentialsByType[type].map(
				(option: ICredentialsResponse) =>
					({
						...option,
						typeDisplayName: credentialsStore.getCredentialTypeByName(type)?.displayName,
					}) as CredentialDropdownOption,
			),
		);
	});
	return options;
}

function getSelectedId(type: string) {
	if (isCredentialExisting(type)) {
		return selected.value[type].id;
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
			position: props.node.position,
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
	const newCredentialOptionSelected = credentialId === NEW_CREDENTIALS_TEXT;
	if (!credentialId || newCredentialOptionSelected) {
		createNewCredential(credentialType, newCredentialOptionSelected, showAuthOptions);
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
			updateNodeAuthType(props.node, authOption.value);
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
			position: props.node.position,
		},
	};

	emit('credentialSelected', updateInformation);
}

function displayCredentials(credentialTypeDescription: INodeCredentialDescription): boolean {
	if (credentialTypeDescription.displayOptions === undefined) {
		// If it is not defined no need to do a proper check
		return true;
	}
	return nodeHelpers.displayParameter(
		props.node.parameters,
		credentialTypeDescription,
		'',
		props.node,
	);
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

function isCredentialExisting(credentialType: string): boolean {
	if (!props.node.credentials?.[credentialType]?.id) {
		return false;
	}
	const { id } = props.node.credentials[credentialType];
	const options = getCredentialOptions([credentialType]);

	return !!options.find((option: ICredentialsResponse) => option.id === id);
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

function showMixedCredentials(credentialType: INodeCredentialDescription): boolean {
	const isRequired = isRequiredCredential(nodeType.value, credentialType);

	return !KEEP_AUTH_IN_NDV_FOR_NODES.includes(props.node.type ?? '') && isRequired;
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
						:model-value="getSelectedId(type.name)"
						:placeholder="getSelectPlaceholder(type.name, getIssues(type.name))"
						size="small"
						@update:model-value="
							(value: string) => onCredentialSelected(type.name, value, showMixedCredentials(type))
						"
						@blur="emit('blur', 'credentials')"
					>
						<N8nOption
							v-for="item in options"
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
						<N8nOption
							:key="NEW_CREDENTIALS_TEXT"
							data-test-id="node-credentials-select-item-new"
							:value="NEW_CREDENTIALS_TEXT"
							:label="NEW_CREDENTIALS_TEXT"
						>
						</N8nOption>
					</N8nSelect>

					<div v-if="getIssues(type.name).length && !hideIssues" :class="$style.warning">
						<N8nTooltip placement="top">
							<template #content>
								<TitledList
									:title="`${i18n.baseText('nodeCredentials.issues')}:`"
									:items="getIssues(type.name)"
								/>
							</template>
							<font-awesome-icon icon="exclamation-triangle" />
						</N8nTooltip>
					</div>

					<div
						v-if="selected[type.name] && isCredentialExisting(type.name)"
						:class="$style.edit"
						data-test-id="credential-edit-button"
					>
						<font-awesome-icon
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
	margin-top: var(--spacing-xs);

	& > div:not(:first-child) {
		margin-top: var(--spacing-xs);
	}
}

.warning {
	min-width: 20px;
	margin-left: 5px;
	color: #ff8080;
	font-size: var(--font-size-s);
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color-text-base);
	min-width: 20px;
	margin-left: 5px;
	font-size: var(--font-size-s);
}

.input {
	display: flex;
	align-items: center;
}

.hasIssues {
	composes: input;
	--input-border-color: var(--color-danger);
}

.credentialOption {
	display: flex;
	flex-direction: column;
}
</style>
