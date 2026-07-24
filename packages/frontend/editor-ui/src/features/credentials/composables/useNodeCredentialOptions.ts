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
import {
	computed,
	toValue,
	unref,
	type ComputedRef,
	type MaybeRef,
	type MaybeRefOrGetter,
} from 'vue';

export interface CredentialDropdownOption extends ICredentialsResponse {
	typeDisplayName: string;
}

export function useNodeCredentialOptions(
	node: ComputedRef<INodeUi | null>,
	nodeType: ComputedRef<INodeTypeDescription | null>,
	overrideCredType: MaybeRef<NodeParameterValueType | undefined>,
	displayAllOptions: MaybeRefOrGetter<boolean> = false,
) {
	const nodeHelpers = useNodeHelpers();
	const credentialsStore = useCredentialsStore();
	const mainNodeAuthField = computed(() => getMainAuthField(nodeType.value));
	const hasOverride = computed(() => {
		const override = unref(overrideCredType);
		return typeof override === 'string' && override !== '';
	});

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
				credentialsStore.allUsableCredentialsByType[type]?.map<CredentialDropdownOption>(
					(option: ICredentialsResponse) => ({
						...option,
						typeDisplayName: credentialsStore.getCredentialTypeByName(type)?.displayName ?? '',
					}),
				) ?? [],
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
		if (!node.value || hasOverride.value) {
			return false;
		}

		const isRequired = isRequiredCredential(nodeType.value, credentialType);

		return !KEEP_AUTH_IN_NDV_FOR_NODES.includes(node.value.type) && isRequired;
	}

	function isMainAuthCredential(credentialType: INodeCredentialDescription): boolean {
		const authFieldName = mainNodeAuthField.value?.name;
		return (
			authFieldName !== undefined &&
			credentialType.displayOptions?.show?.[authFieldName] !== undefined
		);
	}

	function shouldShowRelatedCredentials(credentialType: INodeCredentialDescription): boolean {
		/**
		 * Show related credentials if:
		 * - the credential type is mixed - one selector combines multiple credential types
		 * - the credential type is the main auth credential - the main auth field is shown in the node UI
		 * - the display all options is enabled
		 */
		return (
			showMixedCredentials(credentialType) ||
			(toValue(displayAllOptions) && isMainAuthCredential(credentialType))
		);
	}

	function getAllRelatedCredentialTypes(credentialType: INodeCredentialDescription): string[] {
		if (hasOverride.value || !shouldShowRelatedCredentials(credentialType)) {
			return [credentialType.name];
		}

		const authFieldName = mainNodeAuthField.value?.name;
		// if no main auth field exists, return the credential type itself
		if (!authFieldName) {
			return [credentialType.name];
		}

		// otherwise, return all related credential types
		return getAllNodeCredentialForAuthType(nodeType.value, authFieldName).map((cred) => cred.name);
	}

	function isCredentialExisting(credentialType: INodeCredentialDescription): boolean {
		const credential = node.value?.credentials?.[credentialType.name];
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
