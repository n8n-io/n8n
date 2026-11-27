import { isRecord } from '@n8n/utils/is-record';
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

import { loadModule } from './parse';

type Place = 'the top level' | 'Options';

interface Field {
	place: Place;
	type: string;
	default: unknown;
	values: unknown[];
}

interface Operation {
	operationId: string;
	response: unknown;
	fields: Map<string, Field>;
}

interface Contract {
	defaultResource?: string;
	defaultOperations: Map<string, string | undefined>;
	operations: Map<string, Operation>;
}

interface OperationSelector {
	resource: string;
	defaultOperation?: string;
	options: INodePropertyOptions[];
}

type NodeOption = NonNullable<INodeProperties['options']>[number];

const moduleSchema = z.object({ properties: z.array(z.custom<INodeProperties>(isRecord)) });

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const isOption = (option: NodeOption): option is INodePropertyOptions => 'value' in option;

const isProperty = (option: NodeOption): option is INodeProperties => 'type' in option;

const keyOf = (resource: string, operationId: string) => `${resource} / ${operationId}`;

const typeOf = ({ type, default: value }: INodeProperties) => {
	if (type !== 'json') return type;
	return typeof value === 'string' && value.trimStart().startsWith('[')
		? 'json array'
		: 'json object';
};

const valuesOf = ({ type, options = [], modes = [] }: INodeProperties): unknown[] =>
	type === 'resourceLocator'
		? modes.map((mode) => mode.name)
		: options.filter(isOption).map((option) => option.value);

const fieldOf = (property: INodeProperties, place: Place): Field => ({
	place,
	type: typeOf(property),
	default: property.default,
	values: valuesOf(property),
});

const shownFor = ({ displayOptions }: INodeProperties) => ({
	resource: asString(displayOptions?.show?.resource?.[0]),
	operationId: asString(displayOptions?.show?.operation?.[0]),
});

function fieldsOf(property: INodeProperties): Array<[string, Field]> {
	if (property.name !== 'options' || property.type !== 'collection') {
		return [[property.name, fieldOf(property, 'the top level')]];
	}
	return (property.options ?? [])
		.filter(isProperty)
		.map((option) => [option.name, fieldOf(option, 'Options')]);
}

function selectorsOf(properties: INodeProperties[]): OperationSelector[] {
	return properties.flatMap((property) => {
		const { resource } = shownFor(property);
		if (property.name !== 'operation' || resource === undefined) return [];
		const options = (property.options ?? []).filter(isOption);
		return [{ resource, defaultOperation: asString(property.default), options }];
	});
}

function operationsOf(
	properties: INodeProperties[],
	{ resource, options }: OperationSelector,
): Array<[string, Operation]> {
	return options.map((option) => {
		const operationId = String(option.value);
		const fields = properties
			.filter((property) => isDeepStrictEqual(shownFor(property), { resource, operationId }))
			.flatMap(fieldsOf);
		const response: unknown = option.routing?.output?.postReceive;
		return [keyOf(resource, operationId), { operationId, response, fields: new Map(fields) }];
	});
}

function contractOf(properties: INodeProperties[]): Contract {
	const resourceSelector = properties.find(
		(property) => property.name === 'resource' && shownFor(property).resource === undefined,
	);
	const selectors = selectorsOf(properties);
	return {
		defaultResource: asString(resourceSelector?.default),
		defaultOperations: new Map(
			selectors.map(({ resource, defaultOperation }) => [resource, defaultOperation]),
		),
		operations: new Map(selectors.flatMap((selector) => operationsOf(properties, selector))),
	};
}

function fieldBreaks(operationId: string, name: string, before: Field, after?: Field): string[] {
	const field = `the field "${name}"`;
	if (after === undefined) return [`${field} is gone.`];
	if (before.place !== after.place) {
		return [`${field} moved from ${before.place} to ${after.place}.`];
	}
	if (before.type !== after.type) {
		return [`${field} changed its type from ${before.type} to ${after.type}.`];
	}
	const breaks: string[] = [];
	if (before.place === 'the top level' && !isDeepStrictEqual(before.default, after.default)) {
		breaks.push(
			`${field} changed its default from ${JSON.stringify(before.default)} to ${JSON.stringify(after.default)}. To keep the old default, set ${operationId}.fields.${name}.default in overrides.ts. For a field from "*", copy the whole field there.`,
		);
	}
	const lost = before.values.filter((value) => !after.values.includes(value));
	if (lost.length > 0) {
		breaks.push(
			`${field} lost the values ${lost.map((value) => JSON.stringify(value)).join(', ')}.`,
		);
	}
	return breaks;
}

function operationBreaks(before: Operation, after?: Operation): string[] {
	if (after === undefined) return ['the operation is gone.'];
	const breaks: string[] = isDeepStrictEqual(before.response, after.response)
		? []
		: ['the response format changed.'];
	for (const [name, field] of before.fields) {
		breaks.push(...fieldBreaks(before.operationId, name, field, after.fields.get(name)));
	}
	for (const [name, field] of after.fields) {
		if (!before.fields.has(name) && field.place === 'the top level') {
			breaks.push(`the field "${name}" is new at the top level.`);
		}
	}
	return breaks;
}

export function findBreakingChanges(base: INodeProperties[], current: INodeProperties[]): string[] {
	const before = contractOf(base);
	const after = contractOf(current);
	const breaks: string[] = [];

	const { defaultResource } = before;
	if (
		defaultResource !== undefined &&
		after.defaultOperations.has(defaultResource) &&
		after.defaultResource !== defaultResource
	) {
		breaks.push(
			`The default resource changed from "${defaultResource}" to "${after.defaultResource}". To keep the old default, set defaultResource back to "${defaultResource}" in overrides.ts.`,
		);
	}
	for (const [resource, operationId] of before.defaultOperations) {
		if (operationId === undefined) continue;
		const now = after.defaultOperations.get(resource);
		if (after.operations.has(keyOf(resource, operationId)) && now !== operationId) {
			breaks.push(
				`${resource}: the default operation changed from "${operationId}" to "${now}". To keep the old default, move default: true back to ${operationId} in overrides.ts.`,
			);
		}
	}
	for (const [key, operation] of before.operations) {
		const changes = operationBreaks(operation, after.operations.get(key));
		breaks.push(...changes.map((change) => `${key}: ${change}`));
	}
	return breaks;
}

export function compareOperations(committed: INodeProperties[], current: INodeProperties[]) {
	const before = contractOf(committed).operations;
	const after = contractOf(current).operations;
	return {
		added: [...after.keys()].filter((key) => !before.has(key)),
		removed: [...before.keys()].filter((key) => !after.has(key)),
	};
}

export async function loadProperties(file: string) {
	const { properties } = await loadModule({ file, schema: moduleSchema, subject: 'the node' });
	return properties;
}
