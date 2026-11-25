import pluralize from 'pluralize';

import { NODE_PARAMETER_NAMES, operationLabel } from './build-properties';
import type { Overrides, OverridesEntry } from './overrides';
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

function flattenErrors({ operationId, parameters }: SpecOperation, field: string): string[] {
	if (!parameters.some((parameter) => parameter.property !== undefined)) {
		return [`flatten: "${operationId}" has no body field "${field}" that is a list of objects.`];
	}
	const names = parameters.map((parameter) => parameter.name);
	const repeated = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
	return repeated.map(
		(name) => `flatten: "${operationId}" gets two fields with the name "${name}".`,
	);
}

function entryErrors(rows: OperationRow[], entries: Record<string, OverridesEntry>): string[] {
	return Object.entries(entries).flatMap(([operationId, { exclude, flatten }]) => {
		const row = rows.find((candidate) => candidate.operation.operationId === operationId);
		if (!row) {
			return [
				`overrides: "${operationId}" is not an operation in the spec. The spec does not contain this operation any more, or the ID is not correct.`,
			];
		}
		return [
			...(exclude?.trim() === '' ? [`exclude: "${operationId}" has no reason.`] : []),
			...(flatten === undefined ? [] : flattenErrors(row.operation, flatten)),
		];
	});
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

function defaultErrors(rows: OperationRow[], defaultResource: string | undefined): string[] {
	const inNode = rows.filter((row) => row.excludeReason === undefined);
	const resources = [...new Set(inNode.map((row) => row.resource.id))];
	if (resources.length === 0) return [];

	const errors =
		defaultResource !== undefined && resources.includes(defaultResource)
			? []
			: [`defaultResource must be one of the resources in the node: ${resources.join(', ')}.`];
	for (const resource of resources) {
		const defaults = inNode
			.filter((row) => row.resource.id === resource && row.isDefault)
			.map((row) => row.operation.operationId);
		if (defaults.length !== 1) {
			const found = defaults.length === 0 ? 'none' : `${defaults.length}: ${defaults.join(', ')}`;
			errors.push(
				`"${resource}" needs one operation in the node with default: true. It has ${found}.`,
			);
		}
	}
	return errors;
}

export function resolveOperations(
	spec: Spec,
	overrides: Overrides,
	defaultResource?: string,
): Resolution {
	const { '*': shared, ...entries } = overrides;
	const rows = spec.operations.map((operation): OperationRow => {
		const { exclude, flatten, fields, default: isDefault } = entries[operation.operationId] ?? {};
		return {
			operation: flattened(operation, flatten),
			resource: resourceOf(operation.tag),
			excludeReason: exclude,
			isDefault: isDefault === true,
			fields: { ...shared?.fields, ...fields },
		};
	});

	return {
		rows,
		errors: [
			...entryErrors(rows, entries),
			...nodeErrors(rows),
			...defaultErrors(rows, defaultResource),
		],
	};
}
