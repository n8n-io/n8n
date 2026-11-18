import { getNodeParameters } from '../convert/node-parameters.ts';
import type { Json, WalkMember, WalkNode, WalkProperty } from './walk.ts';
import {
	displayedProperty,
	locatorRule,
	locatorSample,
	propertiesOf,
	resolveParameters,
} from './walk.ts';

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
	rejected?: { value: unknown; fields: Record<string, unknown[]> };
	settled?: boolean;
}

const MAX_CHOICES = 12;
const MAX_MANY_CHOICES = 40;
const MAX_GROUP_CASES = 16;
const MAX_VARIANT_CASES = 100;
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

const CHECKED_SAMPLES: Record<string, { values: unknown[]; items: unknown[] }> = {
	number: { values: [7, '8', 'x'], items: ['7', 8, 'x'] },
	boolean: { values: [true, 'false', 'maybe'], items: ['true', false, 'maybe'] },
	array: { values: [['a'], '["a","b"]', 'x'], items: ['["a"]', ['b'], 'x'] },
	jwt: { values: ['a.b.c', 'x'], items: ['a.b.c', 'd.e.f', 'x'] },
};

export function checkedSamples(
	member: WalkMember,
): { values: unknown[]; items: unknown[] } | undefined {
	if (member.validateType === undefined || member.ignoreValidationDuringExecution) return undefined;
	if (member.validateType !== 'options') return CHECKED_SAMPLES[member.validateType];
	const choices = choicesOf(member);
	if (choices.length === 0) return undefined;
	const wrong = 'not-a-choice';
	return {
		values: [choices[0], wrong],
		items: [choices[0], choices[1] ?? choices[0], wrong],
	};
}

const MAPPER_CHOICES = [
	{ name: 'A', value: 'a' },
	{ name: 'B', value: 'b' },
];
const MAPPER_FIELDS: Array<[string, string]> = [
	['text', 'string'],
	['count', 'number'],
	['done', 'boolean'],
	['at', 'time'],
	['list', 'array'],
	['kind', 'options'],
];

function mapperSchema(required: string[]): Json[] {
	return MAPPER_FIELDS.map(([id, type]) => ({
		id,
		displayName: id,
		required: required.includes(id),
		defaultMatch: false,
		display: true,
		type,
		canBeUsedToMatch: true,
		removed: false,
		...(type === 'options' ? { options: MAPPER_CHOICES } : {}),
	}));
}

function mapperValue(value: Json, more: Json = {}): Json {
	return {
		mappingMode: 'defineBelow',
		value,
		matchingColumns: ['text'],
		schema: mapperSchema([]),
		attemptToConvertTypes: false,
		convertFieldsToString: false,
		...more,
	};
}

export function mapperVariant(name: string, itemExpression: (field: string) => string): Variant {
	const typed = { text: 't', count: 5, done: true, at: '10:30', list: ['a'], kind: 'a' };
	const loose = { text: 5, count: '5', done: 'true', at: '10:30:00', list: '["a","b"]', kind: 'b' };
	const converts = { attemptToConvertTypes: true, convertFieldsToString: true };
	const text = fieldNameOf(`${name}_text`);
	const count = fieldNameOf(`${name}_count`);
	const perItem = mapperValue(
		{ ...typed, text: itemExpression(text), count: itemExpression(count) },
		{ attemptToConvertTypes: true },
	);
	return {
		condition: name,
		name,
		values: [
			mapperValue(typed),
			mapperValue(loose, converts),
			mapperValue(loose),
			mapperValue(loose, { convertFieldsToString: true }),
			mapperValue({ ...typed, count: null, list: null }),
			mapperValue({ ...typed, count: 'x' }, converts),
			mapperValue({ ...typed, done: 'maybe' }, converts),
			mapperValue({ ...typed, at: '10h30' }),
			mapperValue({ ...typed, list: 'x' }, converts),
			mapperValue({ ...typed, kind: 'c' }),
			mapperValue({ ...typed, text: null }, { schema: mapperSchema(['text']) }),
		],
		form: { value: perItem, fields: { [text]: ['t', 'tb', 'tc'], [count]: ['5', 6, '7'] } },
		rejected: { value: perItem, fields: { [text]: ['t', 5, null], [count]: ['5', null, 'x'] } },
	};
}

const MAX_GROUP_DEPTH = 2;

function collectionSample(collection: WalkMember, depth: number): Json | undefined {
	if (depth >= MAX_GROUP_DEPTH) return undefined;
	const out: Json = {};
	for (const member of collection.options ?? []) {
		if (!member.name) continue;
		const sample =
			member.type === 'collection'
				? collectionSample(member, depth + 1)
				: samplesOf(member, member.default)[0];
		if (sample === undefined) return undefined;
		out[member.name] = sample;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function membersTogetherAndAlone(collection: WalkMember): unknown[] {
	const together: Json = {};
	for (const member of collection.options ?? []) {
		if (!member.name) continue;
		const sample =
			member.type === 'collection'
				? collectionSample(member, 0)
				: samplesOf(member, member.default)[0];
		if (sample === undefined) return [];
		together[member.name] = sample;
	}
	const names = Object.keys(together);
	if (names.length === 0) return [];
	return [together, ...names.map((name) => ({ [name]: together[name] }))];
}

function innerGroups(
	property: WalkProperty,
	group: WalkMember,
	field: WalkMember,
	itemExpression: (field: string) => string,
	depth: number,
): { all: unknown[]; withItems?: Json; fields: Record<string, unknown[]> } | undefined {
	if (depth >= MAX_GROUP_DEPTH) return undefined;
	const inner: WalkProperty = {
		name: `${property.name}.${group.name}.${field.name}`,
		type: 'fixedCollection',
		options: field.options,
		typeOptions: field.typeOptions,
	};
	const first: Json = {};
	const withItems: Json = {};
	const fields: Record<string, unknown[]> = {};
	const others: Json[] = [];
	let hasItems = false;
	for (const innerGroup of field.options ?? []) {
		const built = groupVariant(inner, innerGroup, itemExpression, depth + 1);
		if (!built || built.member === undefined) return undefined;
		first[built.member] = built.values[0];
		withItems[built.member] = built.form ? built.form.value : built.values[0];
		if (built.form) {
			hasItems = true;
			Object.assign(fields, built.form.fields);
		}
		for (const other of built.values.slice(1)) others.push({ [built.member]: other });
	}
	if (Object.keys(first).length === 0) return undefined;
	return {
		all: [first, ...others.map((other) => ({ ...first, ...other }))],
		...(hasItems ? { withItems } : {}),
		fields,
	};
}

const MAX_COMBINATIONS = 64;

function siblingKeys(group: WalkMember): Set<string> {
	const names = new Set(
		(group.values ?? []).flatMap((field) =>
			field.name && field.type !== 'hidden' && field.type !== 'notice' ? [field.name] : [],
		),
	);
	const keys = new Set<string>();
	for (const field of group.values ?? []) {
		for (const rules of [field.displayOptions?.show, field.displayOptions?.hide])
			for (const key of Object.keys(rules ?? {})) if (names.has(key)) keys.add(key);
	}
	return keys;
}

function shownWith(field: WalkMember, entry: Json, siblings: Set<string>): boolean {
	for (const [key, allowed] of Object.entries(field.displayOptions?.show ?? {}))
		if (siblings.has(key) && !allowed.includes(entry[key])) return false;
	for (const [key, denied] of Object.entries(field.displayOptions?.hide ?? {}))
		if (siblings.has(key) && denied.includes(entry[key])) return false;
	return true;
}

function combinedGroupVariant(
	property: WalkProperty,
	group: WalkMember,
	siblings: Set<string>,
	itemExpression: (field: string) => string,
	depth: number,
): Variant | undefined {
	if (!group.name) return undefined;
	let entries: Json[] = [{}];
	const free = new Map<string, WalkMember[]>();
	const tried = new Map<string, Set<unknown>>();
	for (const field of group.values ?? []) {
		if (!field.name || field.type === 'notice' || field.type === 'hidden') continue;
		const name = field.name;
		const choices = choicesOf(field);
		const nested =
			field.type === 'fixedCollection'
				? innerGroups(property, group, field, itemExpression, depth)
				: undefined;
		const all =
			field.type === 'options' && choices.length > 0
				? siblings.has(name)
					? choices
					: [choices[0]]
				: nested
					? [nested.all[0]]
					: field.type === 'collection'
						? membersTogetherAndAlone(field).slice(0, 1)
						: samplesOf(field, field.default).slice(0, 1);
		if (all.length === 0) return undefined;
		if (field.type === 'options' && choices.length > 1 && !siblings.has(name))
			free.set(name, [...(free.get(name) ?? []), field]);
		const next: Json[] = [];
		const seen = tried.get(name) ?? new Set<unknown>();
		tried.set(name, seen);
		const fresh = all.filter((value) => !seen.has(value));
		for (const entry of entries) {
			if (!shownWith(field, entry, siblings)) next.push(entry);
			else if (name in entry) {
				next.push(entry);
				if (siblings.has(name) && entry[name] === [...seen][0])
					for (const value of fresh) next.push({ ...entry, [name]: value });
			} else for (const value of all) next.push({ ...entry, [name]: value });
		}
		for (const value of all) seen.add(value);
		if (next.length > MAX_COMBINATIONS) return undefined;
		entries = next;
	}
	entries = entries.filter((entry) => Object.keys(entry).length > 0);
	if (entries.length === 0) return undefined;
	const others: Json[] = [];
	for (const [name, fields] of free) {
		for (const field of fields) {
			const base = entries.find((entry) => name in entry && shownWith(field, entry, siblings));
			if (!base) continue;
			for (const choice of choicesOf(field)) {
				if (choice === base[name] || others.length >= MAX_GROUP_CASES) continue;
				others.push({ ...base, [name]: choice });
			}
		}
	}
	const multiple = property.typeOptions?.multipleValues === true;
	const valueOf = (first: Json, more: Json[]) => (multiple ? [first, ...more] : first);
	const [first, second] = entries;
	const withItems: Json = {};
	const fields: Record<string, unknown[]> = {};
	for (const field of group.values ?? []) {
		if (!field.name || !(field.name in first) || field.name in withItems) continue;
		if (!shownWith(field, first, siblings)) continue;
		const itemValues = itemValuesOf(field, first[field.name]);
		if (itemValues === undefined) continue;
		const itemField = fieldNameOf(`${property.name}_${group.name}_${field.name}`);
		withItems[field.name] = itemExpression(itemField);
		fields[itemField] = itemValues;
	}
	return {
		condition: `${property.name}.${group.name}`,
		name: property.name,
		member: group.name,
		values: [
			valueOf(first, second ? [second] : []),
			...[...entries.slice(1), ...others].map((entry) => valueOf(entry, [])),
		],
		...(Object.keys(fields).length > 0
			? { form: { value: valueOf({ ...first, ...withItems }, second ? [second] : []), fields } }
			: {}),
	};
}

function groupVariant(
	property: WalkProperty,
	group: WalkMember,
	itemExpression: (field: string) => string,
	depth = 0,
): Variant | undefined {
	if (!group.name) return undefined;
	const siblings = siblingKeys(group);
	if (siblings.size > 0)
		return combinedGroupVariant(property, group, siblings, itemExpression, depth);
	const entry: Json = {};
	const second: Json = {};
	const withItems: Json = {};
	const fields: Record<string, unknown[]> = {};
	const others: Json[] = [];
	for (const field of group.values ?? []) {
		if (!field.name || field.type === 'notice' || field.type === 'hidden') continue;
		const choices = choicesOf(field);
		const nested =
			field.type === 'fixedCollection'
				? innerGroups(property, group, field, itemExpression, depth)
				: undefined;
		if (field.type === 'fixedCollection' && !nested) return undefined;
		const all = nested
			? nested.all
			: field.type === 'collection'
				? membersTogetherAndAlone(field)
				: field.type === 'options' && choices.length > 0
					? choices
					: samplesOf(field, field.default);
		if (nested?.withItems) {
			withItems[field.name] = nested.withItems;
			Object.assign(fields, nested.fields);
		}
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
		for (const other of all.slice(1)) {
			const text = JSON.stringify({ [field.name]: other });
			if (!others.some((known) => JSON.stringify(known) === text))
				others.push({ [field.name]: other });
		}
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

export function filledGroups(
	node: WalkNode,
	version: number,
	parameters: Json,
	itemExpression: (field: string) => string,
): Json | undefined {
	let out: Json | undefined;
	for (const [name, value] of Object.entries(resolveParameters(node, version, parameters))) {
		if (!isRecord(value) || Object.keys(value).length > 0) continue;
		const property = shownProperty(node, version, parameters, name);
		if (property?.type !== 'fixedCollection') continue;
		const [group] = property.options ?? [];
		const variant = group === undefined ? undefined : groupVariant(property, group, itemExpression);
		if (variant) out = withVariant(out ?? parameters, variant, variant.values[0]);
	}
	return out;
}

const MAX_LOCATOR_MODES = 4;
const LOCATOR_WRONG = 'not a value of the mode';

export function locatorVariants(
	node: WalkNode,
	version: number,
	parameters: Json,
	itemExpression: (field: string) => string,
): Variant[] {
	const resolved = resolveParameters(node, version, parameters);
	const variants: Variant[] = [];
	for (const [name, current] of Object.entries(parameters)) {
		if (!isRecord(current) || current.__rl !== true || typeof current.mode !== 'string') continue;
		const property = displayedProperty(node, version, resolved, name);
		if (property?.type !== 'resourceLocator' || !Array.isArray(property.modes)) continue;
		const modes = property.modes.filter((mode) => typeof mode.name === 'string');
		const ordered = [
			...modes.filter((mode) => mode.name !== current.mode),
			...modes.filter((mode) => mode.name === current.mode),
		].slice(-MAX_LOCATOR_MODES);
		for (const mode of ordered) {
			const rule = locatorRule(mode);
			const sample = mode.name === current.mode ? current.value : locatorSample(mode);
			const fits = (value: unknown) =>
				typeof value === 'string' && (rule === undefined || rule.exec(value) !== null);
			const wrong = rule !== undefined && !fits(LOCATOR_WRONG) ? [LOCATOR_WRONG, 5] : [5];
			const field = fieldNameOf(`${name}_${String(mode.name)}`);
			const locator = (value: unknown): Json => ({ __rl: true, mode: mode.name, value });
			variants.push({
				condition: name,
				name,
				settled: true,
				values: [...(fits(sample) ? [sample] : []), ...wrong].map(locator),
				rejected: {
					value: locator(itemExpression(field)),
					fields: { [field]: [fits(sample) ? sample : wrong[0], wrong[0], wrong.at(-1)] },
				},
			});
		}
	}
	return variants;
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
	for (const variant of locatorVariants(node, version, parameters, itemExpression)) {
		cases += variant.values.length;
		variants.push(variant);
	}
	const mappers: Variant[] = [];
	const many: Variant[] = [];
	for (const [name, value] of Object.entries(resolveParameters(node, version, parameters))) {
		if (name in fixed || FIXED_CHOICES.has(name)) continue;
		const property = shownProperty(node, version, parameters, name);
		if (!property) continue;
		const members = property.type === 'collection' || property.type === 'fixedCollection';
		if (!members && (name in parameters || listed.includes(name))) continue;
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
				const checked = checkedSamples(member);
				const values = [...samplesOf(member, member.default), ...(checked?.values ?? [])];
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
					...(checked === undefined
						? {}
						: { rejected: { value: itemExpression(field), fields: { [field]: checked.items } } }),
				});
			}
		} else if (property.type === 'fixedCollection') {
			for (const group of property.options ?? [])
				take(groupVariant(property, group, itemExpression));
		} else if (property.type === 'resourceMapper') {
			mappers.push(mapperVariant(name, itemExpression));
		} else {
			const checked = checkedSamples(property);
			const values = [...samplesOf(property, value), ...(checked?.values ?? [])];
			const choices = property.type === 'options' ? choicesOf(property) : [];
			if (values.length === 0 && choices.length > MAX_CHOICES) {
				if (choices.length <= MAX_MANY_CHOICES)
					many.push({
						condition: name,
						name,
						values: choices.filter((choice) => choice !== value),
					});
				continue;
			}
			const itemValues = itemValuesOf(property, values[0]);
			const field = fieldNameOf(name);
			take({
				condition: name,
				name,
				values,
				...(itemValues === undefined
					? {}
					: { form: { value: itemExpression(field), fields: { [field]: itemValues } } }),
				...(checked === undefined
					? {}
					: { rejected: { value: itemExpression(field), fields: { [field]: checked.items } } }),
			});
		}
	}
	for (const mapper of mappers) take(mapper);
	for (const variant of many) take(variant);
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
