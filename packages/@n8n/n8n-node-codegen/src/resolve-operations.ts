import pluralize from 'pluralize';

import { NODE_PARAMETER_NAMES, operationLabel } from './build-properties';
import type { Overrides } from './overrides';
import type { OperationRow, Resource, Spec, SpecOperation, SpecTag } from './types';

interface Resolution {
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

const blockersOf = (operation: SpecOperation) => [
	...operation.blockers,
	...operation.parameters
		.filter((parameter) => parameter.required && NODE_PARAMETER_NAMES.includes(parameter.name))
		.map((parameter) => `parameter name "${parameter.name}"`),
];

function flattened(operation: SpecOperation, field: string | undefined): SpecOperation {
	const parameters = operation.parameters.flatMap((parameter) => {
		const { type, items } = parameter.schema;
		if (parameter.name !== field || parameter.location !== 'body' || type !== 'array') {
			return [parameter];
		}
		const fields = Object.entries(items?.properties ?? {}).filter(
			([, schema]) => schema.readOnly !== true,
		);
		return fields.map(([name, schema]) => ({
			name,
			location: 'body' as const,
			property: `${field}[0].${name}`,
			required: parameter.required && (items?.required ?? []).includes(name),
			deprecated: schema.deprecated === true,
			schema,
			description: schema.description,
		}));
	});
	return { ...operation, parameters };
}

function flattenErrors(spec: Spec, flatten: Record<string, string>): string[] {
	return Object.entries(flatten).flatMap(([operationId, field]) => {
		const operation = spec.operations.find((candidate) => candidate.operationId === operationId);
		if (!operation) return [`flatten: "${operationId}" is not an operation in the spec.`];
		const { parameters } = flattened(operation, field);
		if (!parameters.some((parameter) => parameter.property !== undefined)) {
			return [`flatten: "${operationId}" has no body field "${field}" that is a list of objects.`];
		}
		const names = parameters.map((parameter) => parameter.name);
		const repeated = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
		return repeated.map(
			(name) => `flatten: "${operationId}" gets two fields with the name "${name}".`,
		);
	});
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
		const blockers = blockersOf(operation);
		if (blockers.length === 0) continue;
		errors.push(
			`"${operation.operationId}" is not in exclude, but the generator cannot build it: ${blockers.join(', ')}. Add it to exclude with a reason, or add support to the generator.`,
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
		(row) => `${row.resource.displayName} / ${operationLabel(row.operation)}`,
		(row) => row.operation.operationId,
	);
	for (const [name, ids] of idsByName) {
		errors.push(`"${name}" is the name of ${ids.length} operations: ${ids.join(', ')}.`);
	}
	return errors;
}

export function resolveOperations(spec: Spec, overrides: Overrides): Resolution {
	const flatten = overrides.flatten ?? {};
	const rows = spec.operations.map(
		(operation): OperationRow => ({
			operation: flattened(operation, flatten[operation.operationId]),
			resource: resourceOf(operation.tag),
			excludeReason: overrides.exclude[operation.operationId],
		}),
	);

	return {
		rows,
		errors: [
			...excludeErrors(spec, overrides.exclude),
			...flattenErrors(spec, flatten),
			...nodeErrors(rows),
		],
	};
}
