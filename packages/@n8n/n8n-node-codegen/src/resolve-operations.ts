import pluralize from 'pluralize';

import type { Overrides } from './overrides';
import type { Spec, SpecOperation, SpecTag } from './types';

export interface Resource {
	id: string;
	displayName: string;
}

export interface OperationRow {
	operation: SpecOperation;
	resource: Resource;
	excludeReason?: string;
}

export interface Resolution {
	rows: OperationRow[];
	errors: string[];
}

function resourceOf(tag: SpecTag): Resource {
	const id = pluralize.singular(tag.name);
	return {
		id: id.charAt(0).toLowerCase() + id.slice(1),
		displayName: pluralize.singular(tag.displayName),
	};
}

function excludeErrors(spec: Spec, exclude: Record<string, string>): string[] {
	const operationIds = spec.operations.map((operation) => operation.operationId);
	const errors: string[] = [];

	for (const [operationId, reason] of Object.entries(exclude)) {
		if (!operationIds.includes(operationId)) {
			errors.push(
				`exclude: "${operationId}" is not an operation in the spec. The spec does not contain this operation any more, or the ID is not correct.`,
			);
		} else if (reason.trim() === '') {
			errors.push(`exclude: "${operationId}" has no reason.`);
		}
	}
	return errors;
}

function duplicates(
	rows: OperationRow[],
	key: (row: OperationRow) => string,
	value: (row: OperationRow) => string,
): Array<[string, string[]]> {
	const valuesByKey = new Map<string, Set<string>>();
	for (const row of rows) {
		valuesByKey.set(key(row), (valuesByKey.get(key(row)) ?? new Set()).add(value(row)));
	}
	return [...valuesByKey]
		.filter(([, values]) => values.size > 1)
		.map(([duplicate, values]) => [duplicate, [...values]]);
}

function nodeErrors(rows: OperationRow[]): string[] {
	const errors: string[] = [];
	const inNode = rows.filter((row) => row.excludeReason === undefined);

	for (const { operation } of inNode) {
		if (operation.blockers.length === 0) continue;
		errors.push(
			`"${operation.operationId}" is not in exclude, but the generator cannot build it: ${operation.blockers.join(', ')}. Add it to exclude with a reason, or add support to the generator.`,
		);
	}

	const tagsByResource = duplicates(
		inNode,
		(row) => row.resource.id,
		(row) => row.operation.tag.name,
	);
	for (const [id, tags] of tagsByResource) {
		errors.push(`"${id}" is the resource of ${tags.length} tags: ${tags.join(', ')}.`);
	}

	const idsByName = duplicates(
		inNode,
		(row) => `${row.resource.displayName} / ${row.operation.summary}`,
		(row) => row.operation.operationId,
	);
	for (const [name, ids] of idsByName) {
		errors.push(`"${name}" is the name of ${ids.length} operations: ${ids.join(', ')}.`);
	}
	return errors;
}

export function resolveOperations(spec: Spec, overrides: Overrides): Resolution {
	const rows = spec.operations.map(
		(operation): OperationRow => ({
			operation,
			resource: resourceOf(operation.tag),
			excludeReason: overrides.exclude[operation.operationId],
		}),
	);

	return { rows, errors: [...excludeErrors(spec, overrides.exclude), ...nodeErrors(rows)] };
}
