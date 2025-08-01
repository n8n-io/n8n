import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { KEEP_AUTH_IN_NDV_FOR_NODES } from '@/constants';
import type { ICredentialsResponse, INodeUi } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import {
	getAllNodeCredentialForAuthType,
	getMainAuthField,
	isRequiredCredential,
} from '@/utils/nodeTypesUtils';
import {
	HTTP_REQUEST_NODE_TYPE,
	type INodeCredentialDescription,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { computed, unref, type ComputedRef, type MaybeRef } from 'vue';

export interface CredentialDropdownOption extends ICredentialsResponse {
	typeDisplayName: string;
}

export function useNodeCredentialOptions(
	node: ComputedRef<INodeUi | null>,
	nodeType: ComputedRef<INodeTypeDescription | null>,
	overrideCredType: MaybeRef<NodeParameterValueType | undefined>,
) {
	const nodeHelpers = useNodeHelpers();
	const credentialsStore = useCredentialsStore();
	const mainNodeAuthField = computed(() => getMainAuthField(nodeType.value));

	const credentialTypesNodeDescriptions = computed(() =>
		credentialsStore.getCredentialTypesNodeDescriptions(unref(overrideCredType), nodeType.value),
	);

	const credentialTypesNodeDescriptionDisplayed = computed(() =>
		credentialTypesNodeDescriptions.value.filter(displayCredentials).map((type) => ({
			type,
			options: getCredentialOptions(getAllRelatedCredentialTypes(type)),
		})),
	);

	const areAllCredentialsSet = computed(() =>
		credentialTypesNodeDescriptionDisplayed.value.every(({ type }) => isCredentialExisting(type)),
	);

	function getCredentialOptions(types: string[]): CredentialDropdownOption[] {
		let options: CredentialDropdownOption[] = [];
		types.forEach((type) => {
			options = options.concat(
				credentialsStore.allUsableCredentialsByType[type].map<CredentialDropdownOption>(
					(option: ICredentialsResponse) => ({
						...option,
						typeDisplayName: credentialsStore.getCredentialTypeByName(type)?.displayName ?? '',
					}),
				),
			);
		});

		if (node.value?.type === HTTP_REQUEST_NODE_TYPE) {
			options = options.filter((option) => !option.isManaged);
		}

		return options;
	}

	function displayCredentials(credentialTypeDescription: INodeCredentialDescription): boolean {
		if (!node.value) {
			return false;
		}

		if (credentialTypeDescription.displayOptions === undefined) {
			// If it is not defined no need to do a proper check
			return true;
		}
		return nodeHelpers.displayParameter(
			node.value.parameters,
			credentialTypeDescription,
			'',
			node.value,
		);
	}

	function showMixedCredentials(credentialType: INodeCredentialDescription): boolean {
		if (!node.value) {
			return false;
		}

		const isRequired = isRequiredCredential(nodeType.value, credentialType);

		return !KEEP_AUTH_IN_NDV_FOR_NODES.includes(node.value.type) && isRequired;
	}

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

	function isCredentialExisting(credentialType: INodeCredentialDescription): boolean {
		if (!node.value?.credentials?.[credentialType.name]?.id) {
			return false;
		}
		const { id } = node.value.credentials[credentialType.name];
		const options = getCredentialOptions([credentialType.name]);

		return !!options.find((option: ICredentialsResponse) => option.id === id);
	}

	return {
		credentialTypesNodeDescriptions,
		credentialTypesNodeDescriptionDisplayed,
		mainNodeAuthField,
		areAllCredentialsSet,
		showMixedCredentials,
		isCredentialExisting,
	};
}
