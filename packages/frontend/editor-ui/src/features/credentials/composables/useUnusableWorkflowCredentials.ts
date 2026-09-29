import { computed, toValue, type DeepReadonly, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { INodeUi } from '@/Interface';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import type { IUsedCredential } from '../credentials.types';
import { useCredentialSharing } from './useCredentialSharing';

/**
 * The credentials a workflow uses that the current user cannot use, and the
 * reasons to show in place of running or publishing it.
 *
 * The backend refuses both already — a run is checked against the person it
 * acts as, and a publish against the publisher. This is the same answer told
 * before the click instead of after it, and it is one sentence for both:
 * the credential is not this user's to use either way.
 *
 * Reads `currentUserCanUse`, the workflow payload's can-use field. Kept apart
 * from the credential list's `currentUserHasAccess`, which answers can-see: a
 * colleague is shown every credential the workflow references, and only this
 * field says whether they may run with it.
 *
 * @param usedCredentials the workflow's used credentials, as a getter so the
 * caller can supply them from whichever store it already holds.
 * @param nodes the workflow's current nodes, to keep the answer live between
 * saves.
 */
export function useUnusableWorkflowCredentials(
	usedCredentials: MaybeRefOrGetter<DeepReadonly<Record<string, IUsedCredential>> | undefined>,
	nodes: MaybeRefOrGetter<INodeUi[] | undefined>,
) {
	const i18n = useI18n();
	const { isEnabled } = useCredentialSharing();

	/**
	 * The credential ids the nodes reference now. The used-credential metadata
	 * only changes when the workflow is loaded or saved, so a credential the user
	 * has just switched away from is still in it. A disabled node does not run,
	 * and the backend skips it too.
	 */
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

	/**
	 * Who to ask. A personal project is named after its owner, with their email
	 * appended, so only the name is shown; a team project is named directly.
	 */
	const owner = computed(() => {
		const project = unusable.value[0]?.homeProject;
		if (!project?.name) return undefined;
		if (project.type === ProjectTypes.Team) return project.name;

		const { name, email } = splitName(project.name);
		return name ?? email;
	});

	const credentialName = computed(() => unusable.value[0]?.name ?? '');

	/**
	 * One sentence for both running and publishing: the credential is not this
	 * user's to use either way. Empty when nothing is blocked, so a caller can
	 * use it as the whole condition.
	 */
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
