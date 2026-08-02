import type { ResolvedCredentialMatch, UsableCredential } from './credential-matcher';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

function selectBestCandidate(
	candidates: UsableCredential[],
	projectId: string,
): UsableCredential | undefined {
	const owned = candidates.filter((c) => c.homeProject?.id === projectId);
	const sharedIn = candidates.filter((c) => c.sharedWithProjects.some((p) => p.id === projectId));
	const global = candidates.filter((c) => c.isGlobal);

	const tier = owned.length > 0 ? owned : sharedIn.length > 0 ? sharedIn : global;

	return tier.reduce<UsableCredential | undefined>((best, candidate) => {
		if (!best) return candidate;
		if (candidate.updatedAt !== best.updatedAt) {
			return candidate.updatedAt > best.updatedAt ? candidate : best;
		}
		return candidate.id < best.id ? candidate : best;
	}, undefined);
}

export function resolveByCandidateFilter(
	known: PackageCredentialRequirement[],
	usableCredentials: UsableCredential[],
	projectId: string,
	isCandidate: (candidate: UsableCredential, reference: PackageCredentialRequirement) => boolean,
): Map<string, ResolvedCredentialMatch> {
	return new Map(
		known.flatMap((reference) => {
			const candidates = usableCredentials.filter((candidate) => isCandidate(candidate, reference));
			const best = selectBestCandidate(candidates, projectId);
			if (best === undefined) return [];
			return [[reference.id, { targetId: best.id, targetType: best.type }] as const];
		}),
	);
}
