import type { CredentialsEntity } from '@n8n/db';
import isEqual from 'lodash/isEqual';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { mergeCredentialData } from '@/credentials/credential-data-merge';

import type {
	CredentialConflict,
	CredentialImportPlan,
	CredentialUpdateCandidate,
	CredentialUpdateScope,
} from './credential.types';
import { CredentialConflictPolicy } from '../../n8n-packages.types';
import { mergeRequirementConsumers } from '../../spec/requirement-consumers';
import type { SerializedCredentialData } from '../../spec/serialized/credential.schema';

export function resolveCredentialConflictPolicy(
	policy: CredentialConflictPolicy | undefined,
): CredentialConflictPolicy {
	return policy ?? CredentialConflictPolicy.KeepExisting;
}

/**
 * A credential owned by any destination project of the import can change. A global credential
 * can change only in a full import: a selection import acts on its selection only. Its owner does
 * not count, because a global credential is usually in a personal project, and a package never
 * contains personal projects.
 */
export function credentialUpdateScope(
	destinationProjectIds: string[],
	importKind: 'full' | 'selection',
): CredentialUpdateScope {
	return { projectIds: new Set(destinationProjectIds), includeGlobal: importKind === 'full' };
}

export type UpdatableCredential = Pick<
	CredentialsEntity,
	'isManaged' | 'isResolvable' | 'usageScope' | 'isGlobal' | 'shared'
>;

/**
 * Whether the conflict policy can update a matched destination credential. Any other match is
 * only bound: it never changes and never blocks.
 */
export function isUpdateCandidate(
	credential: UpdatableCredential,
	scope: CredentialUpdateScope,
): boolean {
	if (credential.isManaged || credential.isResolvable || credential.usageScope === 'instance') {
		return false;
	}

	// A credential has no owner column: its owner is the project on the `credential:owner` sharing.
	const ownerProjectId = credential.shared?.find(
		(sharing) => sharing.role === 'credential:owner',
	)?.projectId;
	if (ownerProjectId !== undefined && scope.projectIds.has(ownerProjectId)) return true;

	return scope.includeGlobal && credential.isGlobal;
}

/** Package credentials never carry arrays that can apply, see `credential-export-policy.ts`. */
function mergeIntoStored(
	stored: ICredentialDataDecryptedObject,
	incoming: SerializedCredentialData,
): ICredentialDataDecryptedObject {
	return mergeCredentialData({ existing: stored, incoming, arrays: 'keep-existing' });
}

/**
 * Whether `overwrite` would change the destination credential: a different name, or stored
 * data that changes when the package values merge into it. Arrays never count.
 */
export function credentialDiffers(
	stored: { name: string; data: ICredentialDataDecryptedObject },
	incoming: { name: string; data?: SerializedCredentialData },
): boolean {
	if (stored.name !== incoming.name) return true;
	if (incoming.data === undefined) return false;

	return !isEqual(mergeIntoStored(stored.data, incoming.data), stored.data);
}

/** What a package credential would write, so that two payloads compare by effect. */
function writtenPayload(candidate: CredentialUpdateCandidate) {
	return { name: candidate.name, data: mergeIntoStored({}, candidate.data ?? {}) };
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort();
}

function groupByTarget(
	candidates: CredentialUpdateCandidate[],
): Map<string, CredentialUpdateCandidate[]> {
	const byTarget = new Map<string, CredentialUpdateCandidate[]>();
	for (const candidate of candidates) {
		const group = byTarget.get(candidate.targetId) ?? [];
		// Scopes of one project package can plan the same package credential more than once.
		if (!group.some(({ sourceId }) => sourceId === candidate.sourceId)) group.push(candidate);
		byTarget.set(candidate.targetId, group);
	}
	return byTarget;
}

function toConflict(
	kind: CredentialConflict['kind'],
	targetId: string,
	group: CredentialUpdateCandidate[],
): CredentialConflict {
	return {
		kind,
		targetId,
		sourceIds: uniqueSorted(group.map(({ sourceId }) => sourceId)),
		name: group[0].targetName,
		usedBy: mergeRequirementConsumers(group.flatMap(({ usedBy }) => usedBy)),
	};
}

/** One `differs` conflict for each destination credential that the package would change. */
export function differingCredentials(updates: CredentialUpdateCandidate[]): CredentialConflict[] {
	return [...groupByTarget(updates)].map(([targetId, group]) =>
		toConflict('differs', targetId, group),
	);
}

/**
 * Scopes and matchers resolve independently, so two package credentials can land on one
 * destination credential. When their payloads differ, the last write would silently win.
 * All candidates count, also those equal to the destination: writing another one would drop
 * them.
 */
export function divergentCredentials(
	candidates: CredentialUpdateCandidate[],
): CredentialConflict[] {
	return [...groupByTarget(candidates)]
		.filter(([, group]) => {
			const [first, ...others] = group.map(writtenPayload);
			return others.some((payload) => !isEqual(payload, first));
		})
		.map(([targetId, group]) => toConflict('divergent', targetId, group));
}

/** Read-only: classifies which planned credential updates block the import, per policy. */
/* eslint-disable @typescript-eslint/naming-convention -- API credential conflict policy keys */
const CONFLICTS: Record<
	CredentialConflictPolicy,
	(
		candidates: CredentialUpdateCandidate[],
		updates: CredentialUpdateCandidate[],
	) => CredentialConflict[]
> = {
	'keep-existing': () => [],
	overwrite: (candidates) => divergentCredentials(candidates),
	fail: (_candidates, updates) => differingCredentials(updates),
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * The credential conflicts of a whole import. Takes every scope at once, so that a destination
 * credential reached from several scopes gives one conflict.
 */
export function credentialConflicts(
	policy: CredentialConflictPolicy,
	plans: Array<Pick<CredentialImportPlan, 'candidates' | 'updates'>>,
): CredentialConflict[] {
	return CONFLICTS[policy](
		plans.flatMap(({ candidates }) => candidates),
		plans.flatMap(({ updates }) => updates),
	);
}
