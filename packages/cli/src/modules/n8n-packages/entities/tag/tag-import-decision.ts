import type {
	TagReconcile,
	TagRef,
	TagRename,
	TagResolutionFailure,
	TagResolutionFailureKind,
} from './tag.types';
import { TagConflictPolicy, TagMissingMode } from '../../n8n-packages.types';

/** A per-requirement failure; `TagImporter.plan` fills in `usedByWorkflows`. */
export type TagDecisionFailure = Omit<
	TagResolutionFailure,
	'kind' | 'sourceId' | 'name' | 'usedByWorkflows'
> & {
	kind: Exclude<TagResolutionFailureKind, 'permission-denied'>;
	sourceId: string;
	name: string;
};

export type TagEffect =
	| { action: 'attach'; target: TagRef }
	| { action: 'create'; tag: TagRef }
	| { action: 'rename'; rename: TagRename }
	| { action: 'reconcile'; reconcile: TagReconcile }
	| { action: 'drop'; tag: TagRef }
	| { action: 'fail'; failure: TagDecisionFailure };

// Mirrors TagEntity's @Length(1, 24): an invalid name must gate the import at
// plan time instead of failing entity validation halfway through apply.
const TAG_NAME_MAX_LENGTH = 24;

// tag_entity.id is varchar(36) on Postgres — a longer id would otherwise only
// fail at insert, after the gate.
const TAG_ID_MAX_LENGTH = 36;

// \p{Cs}: a lone UTF-16 surrogate would collapse to U+FFFD in the database.
// Format chars (\p{Cf}) stay allowed: entity validation accepts them and
// ZWJ-joined emoji names/ids are legitimate, so gating them would break
// re-import of a package n8n itself exported.
const FORBIDDEN_CHARS = /[\p{Cc}\p{Cs}]/u;

/**
 * Decides the fate of one package tag reference. Matching is by id;
 * `targetTagWithSameId` is the target instance's occupant of the requirement's
 * id and `nameHolder` is a *different* target tag currently holding the
 * requirement's (trimmed) name. Name and id shape are only validated when the
 * effect would write them (create/rename write the name, create/reconcile
 * write the id) — a dropped tag never gates.
 */
export function decideTagImportAction(
	requirement: TagRef,
	targetTagWithSameId: TagRef | undefined,
	nameHolder: TagRef | undefined,
	missingMode: TagMissingMode,
	conflictPolicy: TagConflictPolicy,
): TagEffect {
	const sourceId = requirement.id;
	const name = requirement.name.trim();

	if (targetTagWithSameId) {
		return decideForMatchedId(sourceId, name, targetTagWithSameId, nameHolder, conflictPolicy);
	}

	return decideForAbsentId(sourceId, name, nameHolder, missingMode, conflictPolicy);
}

/** The requirement's id is taken on the target: an exact name match attaches, a differing name is rename drift. */
function decideForMatchedId(
	sourceId: string,
	name: string,
	targetTag: TagRef,
	nameHolder: TagRef | undefined,
	conflictPolicy: TagConflictPolicy,
): TagEffect {
	if (targetTag.name === name) return { action: 'attach', target: targetTag };

	if (conflictPolicy === TagConflictPolicy.Skip) {
		return { action: 'drop', tag: { id: sourceId, name } };
	}

	if (conflictPolicy === TagConflictPolicy.Rename && !nameHolder) {
		return (
			invalidName(name, sourceId) ?? {
				action: 'rename',
				rename: { id: sourceId, from: targetTag.name, to: name },
			}
		);
	}

	// `fail`, or `rename` degraded because another tag holds the wanted name —
	// the drifted id-matched tag and the name holder are two live target tags,
	// so any resolution would merge them; out of scope for an import.
	return {
		action: 'fail',
		failure: {
			kind: 'rename-drift',
			sourceId,
			name,
			existingName: targetTag.name,
			...(nameHolder ? { existingTagId: nameHolder.id } : {}),
		},
	};
}

/** The requirement's id is absent on the target: the tag is missing, unless its name is already taken. */
function decideForAbsentId(
	sourceId: string,
	name: string,
	nameHolder: TagRef | undefined,
	missingMode: TagMissingMode,
	conflictPolicy: TagConflictPolicy,
): TagEffect {
	if (missingMode === TagMissingMode.DoNothing) {
		return { action: 'drop', tag: { id: sourceId, name } };
	}

	if (nameHolder) {
		if (conflictPolicy === TagConflictPolicy.Skip) {
			return { action: 'drop', tag: { id: sourceId, name } };
		}
		// The holder already carries the wanted name, so only the adopted id
		// needs validating.
		if (conflictPolicy === TagConflictPolicy.Rename) {
			return (
				invalidId(sourceId, name) ?? {
					action: 'reconcile',
					reconcile: { id: sourceId, name, oldId: nameHolder.id },
				}
			);
		}
		return {
			action: 'fail',
			failure: { kind: 'name-collision', sourceId, name, existingTagId: nameHolder.id },
		};
	}

	return (
		invalidName(name, sourceId) ??
		invalidId(sourceId, name) ?? { action: 'create', tag: { id: sourceId, name } }
	);
}

function invalidName(name: string, sourceId: string): TagEffect | undefined {
	if (FORBIDDEN_CHARS.test(name)) {
		return { action: 'fail', failure: { kind: 'invalid-name', sourceId, name } };
	}
	// Code points, not UTF-16 units: both @Length (validator.js) and varchar(24) count code points.
	const length = [...name].length;
	if (length >= 1 && length <= TAG_NAME_MAX_LENGTH) return undefined;
	return { action: 'fail', failure: { kind: 'invalid-name', sourceId, name } };
}

function invalidId(sourceId: string, name: string): TagEffect | undefined {
	if (sourceId.length <= TAG_ID_MAX_LENGTH && !FORBIDDEN_CHARS.test(sourceId)) {
		return undefined;
	}
	return { action: 'fail', failure: { kind: 'invalid-id', sourceId, name } };
}
