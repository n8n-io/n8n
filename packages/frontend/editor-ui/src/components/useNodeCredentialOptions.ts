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

	function isCredentialExisting(credentialType: string): boolean {
		if (!node.value?.credentials?.[credentialType]?.id) {
			return false;
		}
		const { id } = node.value.credentials[credentialType];
		const options = getCredentialOptions([credentialType]);

		return !!options.find((option: ICredentialsResponse) => option.id === id);
	}

	const areAllCredentialsSet = computed(() => {
		const displayedCredentials = credentialTypesNodeDescriptions.value.filter(displayCredentials);

		return displayedCredentials.every((credentialType) => {
			const relatedTypes = getAllRelatedCredentialTypes(credentialType);
			return relatedTypes.some((type) => isCredentialExisting(type));
		});
	});

	return {
		credentialTypesNodeDescriptions,
		credentialTypesNodeDescriptionDisplayed: computed(() =>
			credentialTypesNodeDescriptions.value.filter(displayCredentials).map((type) => ({
				type,
				options: getCredentialOptions(getAllRelatedCredentialTypes(type)),
			})),
		),
		mainNodeAuthField,
		showMixedCredentials,
		isCredentialExisting,
		areAllCredentialsSet,
	};
}
