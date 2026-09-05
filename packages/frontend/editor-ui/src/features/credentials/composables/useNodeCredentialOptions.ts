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
	const hasOverride = computed(() => {
		const override = toValue(overrideCredType);
		return typeof override === 'string' && override !== '';
	});

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

		options = options.filter((option) => (option.usageScope ?? 'project') === 'project');

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
		if (!nodeValue || hasOverride.value) {
			return false;
		}

		const isRequired = isRequiredCredential(toValue(nodeType), credentialType);

		return !KEEP_AUTH_IN_NDV_FOR_NODES.includes(nodeValue.type) && isRequired;
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
		return getAllNodeCredentialForAuthType(toValue(nodeType), authFieldName).map(
			(cred) => cred.name,
		);
	}

	function isCredentialExisting(credentialType: INodeCredentialDescription): boolean {
		const credential = toValue(node)?.credentials?.[credentialType.name];
		// Gateway-managed credentials have no real DB record but are properly configured
		if (credential?.__aiGatewayManaged) return true;
		if (!credential?.id) return false;
		// Until the scoped fetch lands there is nothing to match against, and reporting
		// a configured credential as missing raises a credential issue that isn't one.
		if (!credentialsStore.hasFetchedUsableCredentials) return true;
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
