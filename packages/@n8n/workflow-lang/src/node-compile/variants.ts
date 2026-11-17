import { getNodeParameters } from '../convert/node-parameters.ts';
import type { Json, WalkMember, WalkNode, WalkProperty } from './walk.ts';
import { propertiesOf, resolveParameters } from './walk.ts';

const FIXED_CHOICES = new Set(['resource', 'operation', 'authentication']);

function isRecord(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface Variant {
	condition: string;
	name: string;
	member?: string;
	values: unknown[];
	form?: { value: unknown; fields: Record<string, unknown[]> };
}

const MAX_CHOICES = 12;
const MAX_GROUP_CASES = 16;
const MAX_VARIANT_CASES = 60;
const DATES = ['2024-01-10T10:00:00.000Z', '2024-02-11T11:00:00.000Z', '2024-03-12T12:00:00.000Z'];

const fieldNameOf = (name: string) => name.replace(/\W/g, '_');

function choicesOf(member: WalkMember): unknown[] {
	return (member.options ?? [])
		.map((o) => o.value)
		.filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
}

function samplesOf(member: WalkMember, current: unknown): unknown[] {
	const choices = choicesOf(member);
	if (member.type === 'string') return [current === 'v5' ? 'v6' : 'v5'];
	if (member.type === 'number') return [typeof current === 'number' ? current + 1 : 1];
	if (member.type === 'boolean') return [current !== true];
	if (member.type === 'dateTime') return [DATES[0]];
	if (member.type === 'json') return ['{"a":1}'];
	if (member.type === 'options') {
		if (choices.length === 0) return ['v1'];
		const others = choices.filter((choice) => choice !== current);
		return others.length <= MAX_CHOICES ? others : [];
	}
	if (member.type === 'multiOptions') {
		if (choices.length === 0) return [['v1', 'v2']];
		return choices.length <= MAX_CHOICES ? [choices, [choices[0]]] : [];
	}
	return [];
}

function itemValuesOf(member: WalkMember, sample: unknown): unknown[] | undefined {
	const free =
		member.type === 'string' || (member.type === 'options' && choicesOf(member).length === 0);
	if (free && typeof sample === 'string') return [sample, `${sample}b`, `${sample}c`];
	if (member.type === 'number' && typeof sample === 'number')
		return [sample, sample + 1, sample + 2];
	if (member.type === 'dateTime') return DATES;
	return undefined;
}

function groupVariant(
	property: WalkProperty,
	group: WalkMember,
	itemExpression: (field: string) => string,
): Variant | undefined {
	if (!group.name) return undefined;
	const entry: Json = {};
	const second: Json = {};
	const withItems: Json = {};
	const fields: Record<string, unknown[]> = {};
	const others: Json[] = [];
	for (const field of group.values ?? []) {
		if (!field.name || field.type === 'notice') continue;
		const choices = choicesOf(field);
		const all =
			field.type === 'options' && choices.length > 0 ? choices : samplesOf(field, field.default);
		if (all.length === 0 || all.length > MAX_CHOICES) return undefined;
		entry[field.name] = all[0];
		second[field.name] =
			typeof all[0] === 'string' && field.type === 'string' ? `${all[0]}2` : all[0];
		const itemValues = itemValuesOf(field, all[0]);
		if (itemValues !== undefined) {
			const itemField = fieldNameOf(`${property.name}_${group.name}_${field.name}`);
			withItems[field.name] = itemExpression(itemField);
			fields[itemField] = itemValues;
		}
		for (const other of all.slice(1)) others.push({ [field.name]: other });
	}
	if (Object.keys(entry).length === 0 || others.length >= MAX_GROUP_CASES) return undefined;
	const multiple = property.typeOptions?.multipleValues === true;
	const valueOf = (first: Json, more: Json[]) => (multiple ? [first, ...more] : first);
	return {
		condition: `${property.name}.${group.name}`,
		name: property.name,
		member: group.name,
		values: [
			valueOf(entry, [second]),
			...others.map((other) => valueOf({ ...entry, ...other }, [])),
		],
		...(Object.keys(fields).length > 0
			? { form: { value: valueOf({ ...entry, ...withItems }, [second]), fields } }
			: {}),
	};
}

function shownProperty(
	node: WalkNode,
	version: number,
	parameters: Json,
	name: string,
): WalkProperty | undefined {
	const d = node.description;
	const properties = propertiesOf(node);
	const places = properties.flatMap((p, at) => (p.name === name ? [at] : []));
	if (places.length === 1) return properties[places[0]];
	const shown = places.filter((place) => {
		const rest = d.properties.filter((p, at) => p.name !== name || at === place);
		return name in (getNodeParameters(rest, parameters, true, false, version, d) ?? {});
	});
	return shown.length === 1 ? properties[shown[0]] : undefined;
}

export function parameterVariants(
	node: WalkNode,
	version: number,
	parameters: Json,
	fixed: Json,
	listed: string[],
	itemExpression: (field: string) => string,
): Variant[] {
	const variants: Variant[] = [];
	let cases = 0;
	const take = (variant: Variant | undefined) => {
		if (!variant || variant.values.length === 0) return;
		if (cases + variant.values.length > MAX_VARIANT_CASES) return;
		cases += variant.values.length;
		variants.push(variant);
	};
	for (const [name, value] of Object.entries(resolveParameters(node, version, parameters))) {
		if (name in fixed || name in parameters || FIXED_CHOICES.has(name) || listed.includes(name))
			continue;
		const property = shownProperty(node, version, parameters, name);
		if (!property) continue;
		if (property.type === 'collection') {
			for (const member of property.options ?? []) {
				if (!member.name) continue;
				if (member.type === 'fixedCollection') {
					const inner: WalkProperty = {
						name: `${name}.${member.name}`,
						type: member.type,
						options: member.options,
						typeOptions: member.typeOptions,
					};
					const groups = (member.options ?? []).map((group) =>
						groupVariant(inner, group, itemExpression),
					);
					const built = groups.filter((group): group is Variant => group !== undefined);
					if (built.length === 0 || built.length !== groups.length) continue;
					const [only] = built;
					take({
						condition: `${name}.${member.name}`,
						name,
						member: member.name,
						values: built.flatMap((group) =>
							group.values.map((entry) => ({ [group.member ?? '']: entry })),
						),
						...(built.length === 1 && only.form
							? {
									form: {
										value: { [only.member ?? '']: only.form.value },
										fields: only.form.fields,
									},
								}
							: {}),
					});
					continue;
				}
				const values = samplesOf(member, member.default);
				const itemValues = itemValuesOf(member, values[0]);
				const field = fieldNameOf(`${name}_${member.name}`);
				take({
					condition: `${name}.${member.name}`,
					name,
					member: member.name,
					values,
					...(itemValues === undefined
						? {}
						: { form: { value: itemExpression(field), fields: { [field]: itemValues } } }),
				});
			}
		} else if (property.type === 'fixedCollection') {
			for (const group of property.options ?? [])
				take(groupVariant(property, group, itemExpression));
		} else {
			const values = samplesOf(property, value);
			const itemValues = itemValuesOf(property, values[0]);
			const field = fieldNameOf(name);
			take({
				condition: name,
				name,
				values,
				...(itemValues === undefined
					? {}
					: { form: { value: itemExpression(field), fields: { [field]: itemValues } } }),
			});
		}
	}
	return variants;
}

export function withVariant(parameters: Json, variant: Variant, value: unknown): Json {
	if (variant.member === undefined) return { ...parameters, [variant.name]: value };
	const current = parameters[variant.name];
	return {
		...parameters,
		[variant.name]: { ...(isRecord(current) ? current : {}), [variant.member]: value },
	};
}
