import type {
	PromotionCredentialGrant,
	PromotionCredentialMove,
	PromotionKeptWorkflow,
	PromotionPlaceholderResult,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { AppliedResult } from './promotions.types';

/**
 * What an Apply did apart from the import: placeholders, grants, moves and kept workflows. The
 * result page lists them, because a person must finish some of them by hand.
 */

/** A workflow or folder that the Apply transferred between two projects. */
export type AppliedMove = {
	kind: 'workflow' | 'folder';
	id: string;
	name: string;
	/** Set only when the result names the project. */
	toProjectId?: string;
	toProjectName?: string;
	/** True when the new project could not run the published version, so the Apply unpublished it. */
	unpublished: boolean;
};

export type ApplyOutcome = {
	placeholders: PromotionPlaceholderResult[];
	grants: PromotionCredentialGrant[];
	credentialsMoved: PromotionCredentialMove[];
	credentialsNotMoved: PromotionCredentialMove[];
	keptWorkflows: PromotionKeptWorkflow[];
	moves: AppliedMove[];
	/** The references that stay unresolved after an incomplete Apply. */
	unresolvedCount: number;
};

const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined);

/**
 * The moves of the result. The result DTO does not declare them yet, so this reads the field
 * `moves` when the server sends it: `{ kind, id, name, toProject? | toProjectId?, unpublished? }`.
 */
function appliedMoves(result: AppliedResult): AppliedMove[] {
	const raw: unknown = Reflect.get(result, 'moves');
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((entry: unknown): AppliedMove[] => {
		if (!isRecord(entry)) return [];
		const id = text(entry.id);
		const name = text(entry.name);
		if (id === undefined || name === undefined) return [];
		const toProject = isRecord(entry.toProject) ? entry.toProject : undefined;
		return [
			{
				kind: entry.kind === 'folder' ? 'folder' : 'workflow',
				id,
				name,
				toProjectId: text(toProject?.id) ?? text(entry.toProjectId),
				toProjectName: text(toProject?.name),
				unpublished: entry.unpublished !== undefined && entry.unpublished !== false,
			},
		];
	});
}

export function applyOutcome(result: AppliedResult): ApplyOutcome {
	const credentialMoves = result.credentialMoves ?? [];
	return {
		placeholders: result.placeholders ?? [],
		grants: result.grants ?? [],
		credentialsMoved: credentialMoves.filter(({ allowed }) => allowed),
		credentialsNotMoved: credentialMoves.filter(({ allowed }) => !allowed),
		keptWorkflows: result.keptWorkflows ?? [],
		moves: appliedMoves(result),
		unresolvedCount: result.dependencyReport?.gaps.length ?? 0,
	};
}

/** True when the result holds something that the toast of the Apply cannot say. */
export function hasApplyOutcome(result: AppliedResult): boolean {
	const outcome = applyOutcome(result);
	return (
		outcome.placeholders.length > 0 ||
		outcome.grants.length > 0 ||
		outcome.credentialsMoved.length > 0 ||
		outcome.credentialsNotMoved.length > 0 ||
		outcome.keptWorkflows.length > 0 ||
		outcome.moves.length > 0 ||
		outcome.unresolvedCount > 0
	);
}
