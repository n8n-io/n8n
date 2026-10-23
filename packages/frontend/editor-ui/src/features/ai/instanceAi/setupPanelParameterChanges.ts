import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import unset from 'lodash/unset';
import { deepCopy, type INodeParameters } from 'n8n-workflow';

type ParameterPath = Array<string | { id: string }>;

export interface SetupParameterChange {
	path: ParameterPath;
	value: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Keep assignment targets stable if an agent reorders the collection. */
function resolvePath(parameters: INodeParameters, path: ParameterPath): string[] | undefined {
	const resolved: string[] = [];
	for (const part of path) {
		if (typeof part === 'string') {
			resolved.push(part);
			continue;
		}
		const collection: unknown = get(parameters, resolved);
		if (!Array.isArray(collection)) return undefined;
		const index = collection.findIndex((entry: unknown) => isRecord(entry) && entry.id === part.id);
		if (index === -1) return undefined;
		resolved.push(String(index));
	}
	return resolved;
}

export function getSetupParameterValue(parameters: INodeParameters, path: ParameterPath): unknown {
	const resolved = resolvePath(parameters, path);
	return resolved ? get(parameters, resolved) : undefined;
}

/** Compare the edited values with their baseline before a write can be queued. */
export function getSetupParameterChanges(
	before: unknown,
	after: unknown,
	path: ParameterPath = [],
): SetupParameterChange[] {
	if (isEqual(before, after)) return [];
	if (isRecord(before) && isRecord(after)) {
		return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) =>
			getSetupParameterChanges(before[key], after[key], [...path, key]),
		);
	}
	if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
		const sameOrder = before.every((entry: unknown, index) => {
			const next: unknown = after[index];
			return !isRecord(entry) || !isRecord(next) || entry.id === next.id;
		});
		if (sameOrder) {
			return before.flatMap((entry: unknown, index) => {
				const part =
					isRecord(entry) && typeof entry.id === 'string' ? { id: entry.id } : String(index);
				return getSetupParameterChanges(entry, after[index], [...path, part]);
			});
		}
	}
	return [{ path, value: cloneDeep(after) }];
}

export function applySetupParameterChanges(
	parameters: INodeParameters,
	changes: SetupParameterChange[],
): INodeParameters {
	const updated = deepCopy(parameters);
	for (const change of changes) {
		const path = resolvePath(updated, change.path);
		if (!path?.length) continue;
		if (change.value === undefined) unset(updated, path);
		else set(updated, path, deepCopy(change.value));
	}
	return updated;
}

/** A newer parent edit replaces all older edits below it. */
export function mergeSetupParameterChanges(
	previous: SetupParameterChange[],
	latest: SetupParameterChange[],
): SetupParameterChange[] {
	return [
		...previous.filter(
			(previousChange) =>
				!latest.some((change) =>
					change.path.every((part, index) => isEqual(part, previousChange.path[index])),
				),
		),
		...latest,
	];
}
