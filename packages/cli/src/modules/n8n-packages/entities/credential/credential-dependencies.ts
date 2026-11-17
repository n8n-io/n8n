import type { CredentialDependencyRequest } from './credential.types';
import { CredentialOwnerPolicy } from '../../n8n-packages.types';
import type { ImportCredentialDependencies } from '../../n8n-packages.types';
import type { ManifestEntry, PackageManifest } from '../../spec/manifest.schema';

/**
 * The home project of each package credential. The project folder that holds the credential
 * file names the home. A file at the top level has no home, unless the caller gives one:
 * packages of an earlier version hold such files.
 */
export function packageCredentialHomes(
	manifest: Pick<PackageManifest, 'credentials' | 'projects'>,
	explicitHomes: Record<string, string> | undefined,
): Map<string, string> {
	const homes = new Map<string, string>();
	const projects = manifest.projects ?? [];

	for (const credential of manifest.credentials ?? []) {
		const project = projects.find(({ target }) => credential.target.startsWith(`${target}/`));
		const home = project?.id ?? explicitHomes?.[credential.id];
		if (home !== undefined) homes.set(credential.id, home);
	}

	return homes;
}

/** Whether the import needs the package credential files to follow the owner of the package. */
export function followsPackageOwner(
	dependencies: ImportCredentialDependencies | undefined,
): boolean {
	return dependencies?.credentialOwnerPolicy === CredentialOwnerPolicy.FollowPackage;
}

/**
 * The decisions of the caller, for the scope of one project.
 *
 * @param scope.requiredCredentialIds The credentials that the workflows of the scope use.
 * @param scope.isSelection A selection import writes only what the selection needs.
 */
export function scopeCredentialDependencies(
	dependencies: ImportCredentialDependencies | undefined,
	homes: ReadonlyMap<string, string>,
	scope: {
		project: ManifestEntry;
		projectPendingCreation: boolean;
		requiredCredentialIds: ReadonlySet<string>;
		isSelection: boolean;
	},
): CredentialDependencyRequest | undefined {
	if (dependencies === undefined) return undefined;

	const projectId = scope.project.id;
	const homedHere = [...homes].filter(([, home]) => home === projectId).map(([id]) => id);
	const explicitOwned = dependencies.ownedCredentialIds;
	let ownedIds: string[];
	if (explicitOwned !== undefined) {
		ownedIds = homedHere.filter((id) => explicitOwned.includes(id));
	} else if (scope.isSelection) {
		ownedIds = homedHere.filter((id) => scope.requiredCredentialIds.has(id));
	} else {
		ownedIds = homedHere;
	}

	return {
		placeholderIds: new Set(dependencies.placeholderCredentialIds),
		allowedUnresolvedIds: new Set(dependencies.allowedUnresolvedCredentialIds),
		grantIds: new Set(
			(dependencies.credentialGrants ?? [])
				.filter((grant) => grant.projectId === projectId)
				.map(({ credentialId }) => credentialId),
		),
		ownerPolicy: dependencies.credentialOwnerPolicy ?? CredentialOwnerPolicy.Keep,
		homes,
		ownedIds: new Set(ownedIds),
		projectPendingCreation: scope.projectPendingCreation,
	};
}
