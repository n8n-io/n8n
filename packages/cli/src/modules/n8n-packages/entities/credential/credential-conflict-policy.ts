import type { SerializedCredentialData } from '@n8n/api-types';
import type { CredentialsEntity } from '@n8n/db';
import isEqual from 'lodash/isEqual';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { mergeCredentialData } from '@/credentials/credential-data-merge';

import type {
	CredentialConflict,
	CredentialImportPlan,
	CredentialMatch,
	CredentialUpdateCandidate,
	CredentialUpdateForbidden,
	CredentialUpdateScope,
} from './credential.types';
import { CredentialConflictPolicy } from '../../n8n-packages.types';
import { mergeRequirementConsumers } from '../../spec/requirement-consumers';

export function resolveCredentialConflictPolicy(
	policy: CredentialConflictPolicy | undefined,
): CredentialConflictPolicy {
	return policy ?? CredentialConflictPolicy.KeepExisting;
}

/**
 * A credential owned by any destination project of the import can change. Any other credential,
 * also a global one, is only bound: a project import must not change a credential that its
 * projects do not own.
 */
export function credentialUpdateScope(destinationProjectIds: string[]): CredentialUpdateScope {
	return { projectIds: new Set(destinationProjectIds) };
}

export type UpdatableCredential = Pick<
	CredentialsEntity,
	'isManaged' | 'isResolvable' | 'usageScope' | 'shared'
>;

/**
 * Whether a matched destination credential is in the update scope of the conflict policy. Any
 * other match is only bound: it never changes and never blocks. A match in scope also needs
 * `credential:update`, else it blocks: see `CredentialImporter`.
 */
export function isUpdateCandidate(
	credential: UpdatableCredential,
	scope: CredentialUpdateScope,
): boolean {
	if (credential.isManaged || credential.isResolvable || credential.usageScope === 'instance') {
		return false;
	}

	const ownerProjectId = credentialOwnerProjectId(credential);
	return ownerProjectId !== undefined && scope.projectIds.has(ownerProjectId);
}

/** A credential has no owner column: its owner is the project on the `credential:owner` sharing. */
export function credentialOwnerProjectId(
	credential: Pick<CredentialsEntity, 'shared'>,
): string | undefined {
	return credential.shared?.find((sharing) => sharing.role === 'credential:owner')?.projectId;
}

/**
 * The stored data with the package values merged in. Package credentials never carry arrays
 * that can apply, see `credential-export-policy.ts`.
 */
export function mergeIntoStored(
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

function groupByTarget<T extends CredentialMatch>(candidates: T[]): Map<string, T[]> {
	const byTarget = new Map<string, T[]>();
	for (const candidate of candidates) {
		const group = byTarget.get(candidate.targetId) ?? [];
		// Scopes of one project package can plan the same package credential more than once,
		// each with its own consumers: keep one entry, with the consumers of all scopes.
		const index = group.findIndex(({ sourceId }) => sourceId === candidate.sourceId);
		if (index === -1) {
			group.push(candidate);
		} else {
			group[index] = {
				...group[index],
				usedBy: mergeRequirementConsumers([...group[index].usedBy, ...candidate.usedBy]),
			};
		}
		byTarget.set(candidate.targetId, group);
	}
	return byTarget;
}

function toTargetIssue(targetId: string, group: CredentialMatch[]): CredentialUpdateForbidden {
	return {
		targetId,
		sourceIds: uniqueSorted(group.map(({ sourceId }) => sourceId)),
		name: group[0].targetName,
		usedBy: mergeRequirementConsumers(group.flatMap(({ usedBy }) => usedBy)),
	};
}

function toConflict(
	kind: CredentialConflict['kind'],
	targetId: string,
	group: CredentialMatch[],
): CredentialConflict {
	return { kind, ...toTargetIssue(targetId, group) };
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

/**
 * The destination credentials that the import writes, each with the package credentials that
 * resolve to it. Only `overwrite` writes. Divergence blocks the import, so all entries of one
 * destination write the same payload.
 */
export function plannedCredentialUpdates(
	policy: CredentialConflictPolicy,
	plans: Array<Pick<CredentialImportPlan, 'updates'>>,
): Map<string, CredentialUpdateCandidate[]> {
	if (policy !== CredentialConflictPolicy.Overwrite) return new Map();

	return groupByTarget(plans.flatMap(({ updates }) => updates));
}

/**
 * One issue for each destination credential in the update scope that the user cannot update.
 * Takes every scope at once, like {@link credentialConflicts}.
 */
export function forbiddenCredentialUpdates(
	plans: Array<Pick<CredentialImportPlan, 'forbidden'>>,
): CredentialUpdateForbidden[] {
	return [...groupByTarget(plans.flatMap(({ forbidden }) => forbidden))].map(([targetId, group]) =>
		toTargetIssue(targetId, group),
	);
}
