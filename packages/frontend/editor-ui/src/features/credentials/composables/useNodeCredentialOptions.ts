import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { KEEP_AUTH_IN_NDV_FOR_NODES } from '@/app/constants';
import type { INodeUi } from '@/Interface';
import type { ICredentialsResponse } from '../credentials.types';
import { useCredentialsStore } from '../credentials.store';
import {
	getAllNodeCredentialForAuthType,
	getMainAuthField,
	isRequiredCredential,
} from '@/app/utils/nodeTypesUtils';
import {
	HTTP_REQUEST_NODE_TYPE,
	type INodeCredentialDescription,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

export interface CredentialDropdownOption extends ICredentialsResponse {
	typeDisplayName: string;
}

export function useNodeCredentialOptions(
	node: MaybeRefOrGetter<INodeUi | null>,
	nodeType: MaybeRefOrGetter<INodeTypeDescription | null>,
	overrideCredType: MaybeRefOrGetter<NodeParameterValueType | undefined>,
	displayAllOptions: MaybeRefOrGetter<boolean> = false,
) {
	const nodeHelpers = useNodeHelpers();
	const credentialsStore = useCredentialsStore();
	const mainNodeAuthField = computed(() => getMainAuthField(toValue(nodeType)));

	const credentialTypesNodeDescriptions = computed(() =>
		credentialsStore.getCredentialTypesNodeDescriptions(
			toValue(overrideCredType),
			toValue(nodeType),
		),
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
				credentialsStore.allUsableCredentialsByType[type]?.map<CredentialDropdownOption>(
					(option: ICredentialsResponse) => ({
						...option,
						typeDisplayName: credentialsStore.getCredentialTypeByName(type)?.displayName ?? '',
					}),
				) ?? [],
			);
		});

		if (toValue(node)?.type === HTTP_REQUEST_NODE_TYPE) {
			options = options.filter((option) => !option.isManaged);
		}

		return options;
	}

	function displayCredentials(credentialTypeDescription: INodeCredentialDescription): boolean {
		const nodeValue = toValue(node);
		if (!nodeValue) {
			return false;
		}

		if (credentialTypeDescription.displayOptions === undefined) {
			// If it is not defined no need to do a proper check
			return true;
		}
		return nodeHelpers.displayParameter(
			nodeValue.parameters,
			credentialTypeDescription,
			'',
			nodeValue,
		);
	}

	function showMixedCredentials(credentialType: INodeCredentialDescription): boolean {
		const nodeValue = toValue(node);
		if (!nodeValue) {
			return false;
		}

		const isRequired = isRequiredCredential(toValue(nodeType), credentialType);

		return !KEEP_AUTH_IN_NDV_FOR_NODES.includes(nodeValue.type) && isRequired;
	}

	function getAllRelatedCredentialTypes(credentialType: INodeCredentialDescription): string[] {
		const credentialIsRequired = showMixedCredentials(credentialType);
		if (credentialIsRequired) {
			if (mainNodeAuthField.value) {
				if (toValue(displayAllOptions)) {
					return toValue(nodeType)?.credentials?.map((cred) => cred.name) ?? [];
				}

				const credentials = getAllNodeCredentialForAuthType(
					toValue(nodeType),
					mainNodeAuthField.value.name,
				);
				return credentials.map((cred) => cred.name);
			}
		}
		return [credentialType.name];
	}

	function isCredentialExisting(credentialType: INodeCredentialDescription): boolean {
		const credential = toValue(node)?.credentials?.[credentialType.name];
		// Gateway-managed credentials have no real DB record but are properly configured
		if (credential?.__aiGatewayManaged) return true;
		if (!credential?.id) return false;
		const options = getCredentialOptions([credentialType.name]);
		return !!options.find((option: ICredentialsResponse) => option.id === credential.id);
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
