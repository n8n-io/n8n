import type { TagRef, TagRename, TagResolutionFailure } from './tag.types';
import { TagConflictPolicy, TagMissingMode } from '../../n8n-packages.types';

/** A per-requirement failure; `TagImporter.plan` fills in `usedByWorkflows`. */
export type TagDecisionFailure = Omit<TagResolutionFailure, 'usedByWorkflows'>;

export type TagEffect =
	| { action: 'attach'; target: TagRef }
	| { action: 'create'; tag: TagRef }
	| { action: 'rename'; rename: TagRename }
	| { action: 'drop'; tag: TagRef }
	| { action: 'fail'; failure: TagDecisionFailure };

// Mirrors TagEntity's @Length(1, 24): an invalid name must gate the import at
// plan time instead of failing entity validation halfway through apply.
const TAG_NAME_MAX_LENGTH = 24;

// Tag ids become an unbounded varchar primary key, so cap package-supplied ids
// here — an oversized id would otherwise only fail at insert, after the gate.
const TAG_ID_MAX_LENGTH = 64;

const CONTROL_OR_FORMAT_CHARS = /[\p{Cc}\p{Cf}]/u;

/**
 * Decides the fate of one package tag reference. Matching is by id;
 * `targetWithSameId` is the target instance's occupant of the requirement's id
 * and `nameHolder` is a *different* target tag currently holding the
 * requirement's (trimmed) name. Name and id shape are only validated when the
 * effect would write (create or rename) — a dropped tag never gates.
 */
export function decideTag(
	requirement: TagRef,
	targetWithSameId: TagRef | undefined,
	nameHolder: TagRef | undefined,
	missingMode: TagMissingMode,
	conflictPolicy: TagConflictPolicy,
): TagEffect {
	const sourceId = requirement.id;
	const name = requirement.name.trim();

	if (targetWithSameId) {
		if (targetWithSameId.name === name) return { action: 'attach', target: targetWithSameId };

		// Rename drift: the same-id target tag carries a different name.
		if (conflictPolicy === TagConflictPolicy.Skip) {
			return { action: 'drop', tag: { id: sourceId, name } };
		}
		if (conflictPolicy === TagConflictPolicy.Rename && !nameHolder) {
			return (
				invalidName(name, sourceId) ?? {
					action: 'rename',
					rename: { id: sourceId, from: targetWithSameId.name, to: name },
				}
			);
		}
		// `fail`, or `rename` degraded because another tag holds the wanted
		// name — resolving that requires id reconciliation (LIGO-874).
		return {
			action: 'fail',
			failure: {
				kind: 'rename-drift',
				sourceId,
				name,
				existingName: targetWithSameId.name,
				...(nameHolder ? { existingTagId: nameHolder.id } : {}),
			},
		};
	}

	if (missingMode === TagMissingMode.DoNothing) {
		return { action: 'drop', tag: { id: sourceId, name } };
	}

	if (nameHolder) {
		// Name collision: the id is free but the name belongs to a different tag.
		if (conflictPolicy === TagConflictPolicy.Skip) {
			return { action: 'drop', tag: { id: sourceId, name } };
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
	if (name.length >= 1 && name.length <= TAG_NAME_MAX_LENGTH && !CONTROL_OR_FORMAT_CHARS.test(name))
		return undefined;
	return { action: 'fail', failure: { kind: 'invalid-name', sourceId, name } };
}

function invalidId(sourceId: string, name: string): TagEffect | undefined {
	if (sourceId.length <= TAG_ID_MAX_LENGTH) return undefined;
	return { action: 'fail', failure: { kind: 'invalid-id', sourceId, name } };
}
