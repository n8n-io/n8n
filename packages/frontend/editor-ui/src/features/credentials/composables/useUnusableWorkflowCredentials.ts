import { computed, toValue, type DeepReadonly, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { INodeUi } from '@/Interface';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import type { IUsedCredential } from '../credentials.types';
import { useCredentialSharing } from './useCredentialSharing';

/**
 * Who to ask about a credential. A personal project is named after its owner,
 * with their email appended, so only the name is shown; a team project is
 * named directly.
 */
export function getCredentialOwnerName(
	credential: DeepReadonly<Pick<IUsedCredential, 'homeProject'>> | undefined,
): string | undefined {
	const project = credential?.homeProject;
	if (!project?.name) return undefined;
	if (project.type === ProjectTypes.Team) return project.name;

	const { name, email } = splitName(project.name);
	return name ?? email;
}

/**
 * The workflow's credentials the current user cannot use, and the reason to
 * show in place of running or publishing it.
 *
 * @param usedCredentials getter for the workflow's used credentials.
 * @param nodes the workflow's current nodes, to stay live between saves.
 */
export function useUnusableWorkflowCredentials(
	usedCredentials: MaybeRefOrGetter<DeepReadonly<Record<string, IUsedCredential>> | undefined>,
	nodes: MaybeRefOrGetter<INodeUi[] | undefined>,
) {
	const i18n = useI18n();
	const { isEnabled } = useCredentialSharing();

	const referencedIds = computed(() => {
		const ids = new Set<string>();

		for (const node of toValue(nodes) ?? []) {
			if (node.disabled) continue;

			for (const credential of Object.values(node.credentials ?? {})) {
				if (credential.id) ids.add(credential.id);
			}
		}

		return ids;
	});

	const unusable = computed(() => {
		if (!isEnabled.value) return [];

		return Object.values(toValue(usedCredentials) ?? {}).filter(
			(credential) =>
				credential.currentUserCanUse === false && referencedIds.value.has(credential.id),
		);
	});

	/** Running and publishing both stop; editing and saving do not. */
	const isBlocked = computed(() => unusable.value.length > 0);

	const owner = computed(() => getCredentialOwnerName(unusable.value[0]));

	const credentialName = computed(() => unusable.value[0]?.name ?? '');

	const reason = computed(() => {
		if (!isBlocked.value) return '';

		return owner.value
			? i18n.baseText('credentialSharing.blocked', {
					interpolate: { credential: credentialName.value, owner: owner.value },
				})
			: i18n.baseText('credentialSharing.blocked.unknownOwner', {
					interpolate: { credential: credentialName.value },
				});
	});

	return { unusable, isBlocked, reason };
}
