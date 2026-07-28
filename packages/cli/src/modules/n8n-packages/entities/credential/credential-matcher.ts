import type { User } from '@n8n/db';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsService } from '@/credentials/credentials.service';

import {
	createFailure,
	type CredentialResolution,
	type CredentialResolutionFailure,
} from './credential.types';
import type { ImportBindingMap } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

export interface CredentialMatcherContext {
	projectId: string;
	user: User;
	credentialBindings?: ImportBindingMap;
}

/** A credential the importing user can use in the target project, as returned by `CredentialsService`. */
export type UsableCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];

/**
 * A target-project credential a matcher located for a package reference, before
 * type compatibility is enforced. {@link CredentialMatcher.match} compares
 * `targetType` against the reference's required type and only then accepts the
 * binding — a credential whose id is reachable but whose type differs cannot
 * satisfy the node's credential slot (n8n resolves node credentials by exact
 * `{ id, type }`), so binding it would silently produce an empty credential.
 */
export interface ResolvedCredentialMatch {
	targetId: string;
	targetType: string;
}

export abstract class CredentialMatcher {
	constructor(
		protected readonly credentialTypes: CredentialTypes,
		protected readonly credentialsService: CredentialsService,
	) {}

	async match(
		requirements: PackageCredentialRequirement[] | undefined,
		context: CredentialMatcherContext,
	): Promise<CredentialResolution> {
		const orphanFailures = orphanBindingFailures(context.credentialBindings, requirements);
		const { known, unknownTypeFailures } = partitionByKnownType(requirements, this.credentialTypes);
		const { bound, unbound } = partitionByExplicitBinding(known, context.credentialBindings);

		const usableCredentials =
			known.length === 0
				? []
				: await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(context.user, {
						projectId: context.projectId,
					});
		const usableTypesById = new Map(usableCredentials.map((c) => [c.id, c.type]));

		const boundLocated = resolveExplicitBindings(bound, usableTypesById);
		const resolvedLocated = this.resolve(unbound, usableCredentials, context);
		const located = new Map([...boundLocated, ...resolvedLocated]);

		const successes: ImportBindingMap = new Map();
		const notFoundFailures: CredentialResolutionFailure[] = [];
		const typeMismatchFailures: CredentialResolutionFailure[] = [];

		for (const reference of known) {
			const match = located.get(reference.id);
			if (match === undefined) {
				notFoundFailures.push(
					createNotFoundFailure(reference, context.credentialBindings?.get(reference.id)),
				);
			} else if (match.targetType !== reference.type) {
				typeMismatchFailures.push(createTypeMismatchFailure(reference, match));
			} else {
				successes.set(reference.id, match.targetId);
			}
		}

		return {
			successes,
			failures: [
				...orphanFailures,
				...unknownTypeFailures,
				...notFoundFailures,
				...typeMismatchFailures,
			],
		};
	}

	/**
	 * Locates the target-project credential each reference points at, keyed by the
	 * reference's source id. Returns only references that resolve to a reachable,
	 * usable credential; type compatibility is enforced by {@link match}, not here.
	 */
	protected abstract resolve(
		unbound: PackageCredentialRequirement[],
		usableCredentials: UsableCredential[],
		context: CredentialMatcherContext,
	): Map<string, ResolvedCredentialMatch>;
}

interface BoundReference {
	reference: PackageCredentialRequirement;
	targetId: string;
}

function partitionByExplicitBinding(
	known: PackageCredentialRequirement[],
	bindings: ImportBindingMap | undefined,
): { bound: BoundReference[]; unbound: PackageCredentialRequirement[] } {
	const bound: BoundReference[] = [];
	const unbound: PackageCredentialRequirement[] = [];

	for (const reference of known) {
		const targetId = bindings?.get(reference.id);
		if (targetId === undefined) {
			unbound.push(reference);
		} else {
			bound.push({ reference, targetId });
		}
	}

	return { bound, unbound };
}

function resolveExplicitBindings(
	bound: BoundReference[],
	usableTypesById: Map<string, string>,
): Map<string, ResolvedCredentialMatch> {
	return new Map(
		bound.flatMap(({ reference, targetId }) => {
			const targetType = usableTypesById.get(targetId);
			if (targetType === undefined) return [];
			return [[reference.id, { targetId, targetType }] as const];
		}),
	);
}

function partitionByKnownType(
	requirements: PackageCredentialRequirement[] | undefined,
	credentialTypes: CredentialTypes,
): {
	known: PackageCredentialRequirement[];
	unknownTypeFailures: CredentialResolutionFailure[];
} {
	const known: PackageCredentialRequirement[] = [];
	const unknownTypeFailures: CredentialResolutionFailure[] = [];

	for (const reference of requirements ?? []) {
		if (credentialTypes.recognizes(reference.type)) {
			known.push(reference);
		} else {
			unknownTypeFailures.push(createFailure(reference, 'unknown_type'));
		}
	}

	return { known, unknownTypeFailures };
}

/**
 * When the importer supplied an explicit binding, include the requested target id on
 * the failure so callers can report which credential was unreachable.
 */
function createNotFoundFailure(
	reference: PackageCredentialRequirement,
	requestedTargetId: string | undefined,
): CredentialResolutionFailure {
	const failure = createFailure(reference, 'not_found');
	return requestedTargetId === undefined ? failure : { ...failure, targetId: requestedTargetId };
}

/**
 * The resolved credential exists and is usable but its type does not match what
 * the package's workflow node requires. Carries both types so the caller can
 * report which binding is wrong rather than reporting a misleading "not found".
 */
function createTypeMismatchFailure(
	reference: PackageCredentialRequirement,
	match: ResolvedCredentialMatch,
): CredentialResolutionFailure {
	return {
		...createFailure(reference, 'type_mismatch'),
		targetId: match.targetId,
		expectedType: reference.type,
		actualType: match.targetType,
	};
}

/**
 * Rejects explicit bindings whose source id is not declared in the package.
 * These cannot go through normal requirement matching because there is no
 * package credential entry to resolve against.
 */
function orphanBindingFailures(
	bindings: ImportBindingMap | undefined,
	requirements: PackageCredentialRequirement[] | undefined,
): CredentialResolutionFailure[] {
	if (!bindings || bindings.size === 0) return [];

	const requirementIds = new Set((requirements ?? []).map((requirement) => requirement.id));
	const failures: CredentialResolutionFailure[] = [];

	for (const [sourceId, targetId] of bindings) {
		if (!requirementIds.has(sourceId)) {
			failures.push({
				kind: 'source_not_found',
				sourceId,
				targetId,
				usedByWorkflows: [],
			});
		}
	}

	return failures;
}
