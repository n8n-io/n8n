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
import { computed, getCurrentScope, ref, toRaw, toValue, watch, type MaybeRefOrGetter } from 'vue';

export interface CredentialDropdownOption extends ICredentialsResponse {
	typeDisplayName: string;
}

export function useNodeCredentialOptions(
	node: MaybeRefOrGetter<INodeUi | null>,
	nodeType: MaybeRefOrGetter<INodeTypeDescription | null>,
	overrideCredType: MaybeRefOrGetter<NodeParameterValueType | undefined>,
	displayAllOptions: MaybeRefOrGetter<boolean> = false,
	/** When provided, build dropdown options from this list instead of the
	 *  shared usable-credentials slice. Hosts that already hold the exact,
	 *  project-scoped, type-matched credential list (e.g. the Instance AI
	 *  setup card, which receives it in the suspend payload) pass it here so
	 *  the dropdown does not depend on a slice that may be empty or cleared
	 *  by a competing scoped fetch. */
	overrideCredentials: MaybeRefOrGetter<ICredentialsResponse[] | undefined> = undefined,
) {
	const nodeHelpers = useNodeHelpers();
	const credentialsStore = useCredentialsStore();
	const mainNodeAuthField = computed(() => getMainAuthField(toValue(nodeType)));
	const hasOverride = computed(() => {
		const override = toValue(overrideCredType);
		return typeof override === 'string' && override !== '';
	});

	// Host-supplied override lists are often a static suspend payload. If a
	// credential is deleted while the panel is open, drop it locally so the
	// dropdown / existence checks do not keep serving the deleted id.
	//
	// Only subscribe inside an active effect scope. Callers like
	// getAutoSelectedCredential invoke this composable outside setup; $onAction
	// would otherwise leak a store subscription per call.
	const removedOverrideIds = ref(new Set<string>());
	// NodeCredentials always passes a getter for `credentials`; only attach the
	// store listener while that getter actually yields a host-supplied list.
	if (getCurrentScope() && overrideCredentials !== undefined) {
		watch(
			() => toValue(overrideCredentials),
			(override, _prev, onCleanup) => {
				removedOverrideIds.value = new Set();
				if (!override) return;
				const stopDeleteListener = credentialsStore.$onAction(({ name, after, args }) => {
					if (name !== 'deleteCredential') return;
					after((deleted) => {
						// deleteCredential returns the API flag; after() still runs on failure.
						if (deleted !== true) return;
						const id = args[0]?.id;
						if (typeof id !== 'string') return;
						const next = new Set(removedOverrideIds.value);
						next.add(id);
						removedOverrideIds.value = next;
					});
				});
				onCleanup(stopDeleteListener);
			},
			{ immediate: true },
		);
	}

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

	function getActiveOverrideCredentials(): ICredentialsResponse[] | undefined {
		const override = toValue(overrideCredentials);
		if (!override) return undefined;
		if (removedOverrideIds.value.size === 0) return override;
		return override.filter((credential) => !removedOverrideIds.value.has(credential.id));
	}

	function isUsableProjectCredential(
		option: ICredentialsResponse,
		credentialTypeName?: string,
	): boolean {
		if (credentialTypeName && option.type !== credentialTypeName) {
			return false;
		}
		// Only an explicit non-project string scope is rejected. Proxies/mocks may
		// expose a non-string usageScope trap; treat those like the unset default.
		if (typeof option.usageScope === 'string' && option.usageScope !== 'project') {
			return false;
		}
		if (toValue(node)?.type === HTTP_REQUEST_NODE_TYPE && option.isManaged) {
			return false;
		}
		return true;
	}

	/**
	 * Copy credential fields via property access on toRaw(...). Spreading a Vue
	 * reactive proxy re-tracks every key (the NDV freeze). Spreading a vitest
	 * mock yields {} because mock fields are non-enumerable Proxy traps — so
	 * read the fields we need instead.
	 */
	function toDropdownOption(
		option: ICredentialsResponse,
		typeDisplayName: string,
	): CredentialDropdownOption {
		const raw = toRaw(option);
		return {
			id: raw.id,
			name: raw.name,
			type: raw.type,
			createdAt: raw.createdAt,
			updatedAt: raw.updatedAt,
			isManaged: raw.isManaged,
			isGlobal: raw.isGlobal,
			isResolvable: raw.isResolvable,
			connectedByMe: raw.connectedByMe,
			connectedAccountIdentifier: raw.connectedAccountIdentifier,
			connectedUserCount: raw.connectedUserCount,
			usageScope: raw.usageScope,
			scopes: raw.scopes,
			homeProject: raw.homeProject,
			sharedWithProjects: raw.sharedWithProjects,
			sharedRoute: raw.sharedRoute,
			typeDisplayName,
		};
	}

	function getCredentialOptions(types: string[]): CredentialDropdownOption[] {
		const override = getActiveOverrideCredentials();
		const options: CredentialDropdownOption[] = [];

		for (const type of types) {
			const typeDisplayName = credentialsStore.getCredentialTypeByName(type)?.displayName ?? '';
			// The override is a host-supplied, already-scoped list; fall back to the
			// shared usable-credentials slice when no override is given. An unfetched
			// slice reads as empty, never as a fallback to the flat map — falling
			// back is the bug this override exists to avoid.
			const credentials = override
				? override.filter((credential) => credential.type === type)
				: (credentialsStore.allUsableCredentialsByType[type] ?? []);

			for (const option of credentials) {
				if (!isUsableProjectCredential(option)) {
					continue;
				}

				options.push(toDropdownOption(option, typeDisplayName));
			}
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
		const override = getActiveOverrideCredentials();
		if (!credentialsStore.hasFetchedUsableCredentials && !override) {
			return true;
		}

		// Host-supplied override list is usually small; check it directly so Instance AI
		// credentials that are not in the shared usable slice still count as present.
		if (override) {
			return override.some(
				(option) =>
					option.id === credential.id && isUsableProjectCredential(option, credentialType.name),
			);
		}

		// O(1) map lookup — do not rebuild the full dropdown options list just to
		// check whether the selected id is still in scope.
		const usable = credentialsStore.usableCredentials[credential.id];
		return !!usable && isUsableProjectCredential(usable, credentialType.name);
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
