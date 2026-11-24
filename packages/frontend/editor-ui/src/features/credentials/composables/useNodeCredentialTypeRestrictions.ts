import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { CredentialTypeAvailability } from '@n8n/api-types';
import {
	describeTypeRestriction,
	getCredentialTypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { getRequestedCredentialTypes, type INode } from 'n8n-workflow';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

export type NodeCredentialTypeRestriction = {
	credentialType: string;
	displayName: string;
	restriction: CredentialTypeAvailability;
};

/**
 * The restricted credential types a node asks for. The backend judges the requested types when a
 * run starts and each selected credential's own type when it decrypts it, so both count here.
 */
export function useNodeCredentialTypeRestrictions(
	node: MaybeRefOrGetter<INode | null | undefined>,
) {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	const restrictions = computed<NodeCredentialTypeRestriction[]>(() => {
		const current = toValue(node);
		if (!current) return [];

		const credentialTypes = new Set(
			getRequestedCredentialTypes(current, () =>
				nodeTypesStore.getNodeType(current.type, current.typeVersion),
			),
		);
		for (const { id } of Object.values(current.credentials ?? {})) {
			const selectedType = id
				? (credentialsStore.getUsableCredentialById(id) ?? credentialsStore.getCredentialById(id))
						?.type
				: undefined;
			if (selectedType) credentialTypes.add(selectedType);
		}

		return [...credentialTypes].flatMap((credentialType) => {
			const restriction = getCredentialTypeRestriction(credentialType);
			if (!restriction) return [];

			const displayName =
				credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
			return [{ credentialType, displayName, restriction }];
		});
	});

	const descriptions = computed(() =>
		restrictions.value.map(({ displayName, restriction }) =>
			describeTypeRestriction('credential', displayName, restriction),
		),
	);

	return { restrictions, descriptions };
}
