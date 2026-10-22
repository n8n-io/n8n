import type { PolicyViolation } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

import {
	fetchCredentialTransferPreview,
	fetchFolderTransferPreview,
	fetchWorkflowTransferPreview,
} from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/** What is being moved. A folder also names its project, because its routes are nested there. */
export type TransferPreviewTarget =
	| { resourceType: 'workflow'; id: string }
	| { resourceType: 'folder'; id: string; projectId: string }
	| { resourceType: 'credential'; id: string };

/** The three preview responses in one shape, so the warning reads a single type. */
export type TransferPreview = {
	restricted: PolicyViolation[];
	unpublishReasons: PolicyViolation[];
	workflowsToUnpublish: Array<{ id: string; name: string }>;
	checkFailed: boolean;
};

async function fetchPreview(
	target: TransferPreviewTarget,
	destinationProjectId: string,
): Promise<TransferPreview> {
	const context = useRootStore().restApiContext;
	const empty = { unpublishReasons: [], workflowsToUnpublish: [] };

	switch (target.resourceType) {
		case 'workflow':
			return {
				...empty,
				...(await fetchWorkflowTransferPreview(context, target.id, destinationProjectId)),
			};
		case 'folder':
			return {
				...empty,
				...(await fetchFolderTransferPreview(
					context,
					target.projectId,
					target.id,
					destinationProjectId,
				)),
			};
		case 'credential':
			return {
				...empty,
				...(await fetchCredentialTransferPreview(context, target.id, destinationProjectId)),
			};
	}
}

/** What a move into the destination project would restrict. `null` while unknown. */
export function useTransferPreview(
	target: MaybeRefOrGetter<TransferPreviewTarget | null>,
	destinationProjectId: MaybeRefOrGetter<string | null | undefined>,
) {
	const policiesStore = useTypeAvailabilityPoliciesStore();
	const preview = shallowRef<TransferPreview | null>(null);
	let latestRequest = 0;

	const request = computed(() => {
		const currentTarget = toValue(target);
		const destination = toValue(destinationProjectId);
		if (!policiesStore.isEnabled || !currentTarget || !destination) return null;

		return {
			target: currentTarget,
			destination,
			key: JSON.stringify([currentTarget, destination]),
		};
	});

	// Keyed by value, so a caller's recomputed target object does not refetch the same preview.
	watch(
		() => request.value?.key,
		async () => {
			const requestId = ++latestRequest;
			preview.value = null;
			const current = request.value;
			if (!current) return;

			try {
				const result = await fetchPreview(current.target, current.destination);
				if (requestId === latestRequest) preview.value = result;
			} catch (error) {
				// Advisory only: the move itself still runs every check, so a failed preview shows nothing.
				console.error('Failed to fetch the transfer preview', error);
			}
		},
		{ immediate: true },
	);

	return { preview };
}
