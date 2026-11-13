/**
 * The parameter rules of n8n's `Workflow` constructor: a port of
 * `NodeHelpers.getNodeParameters` of n8n-workflow 2.42.2, with
 * `returnDefaults: true` and `returnNoneDisplayed: false`. n8n runs it on
 * every node before the node reads a parameter, so a parameter that the
 * `displayOptions` of the node type hide does not reach the node.
 *
 * `hideParameters` applies the rules to the parameters of a library node: it
 * removes the parameters that v1 drops, and keeps the others as they are (it
 * does not add the defaults, which the library nodes apply themselves).
 *
 * The descriptions come from `src/generated/node-descriptions.generated.ts`
 * (`scripts/generate-node-descriptions.ts`). The port has no dependency on
 * n8n-workflow, so the converter runs without it.
 */
import {
	NODE_DESCRIPTIONS,
	NODE_DESCRIPTION_VERSIONS,
} from '../generated/node-descriptions.generated.ts';

/** One parameter of a node type description, or one option of a fixed collection. */
export interface NodeProperty {
	name: string;
	type?: string;
	default?: unknown;
	displayOptions?: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> };
	typeOptions?: { multipleValues?: boolean };
	noDataExpression?: boolean;
	/** A collection: its parameters. A fixed collection: its options, each with `values`. */
	options?: NodeProperty[];
	/** An option of a fixed collection: its parameters. */
	values?: NodeProperty[];
}

export interface NodeDescription {
	name: string;
	features?: Record<string, { '@version'?: unknown[] }>;
	properties: NodeProperty[];
}

type Params = Record<string, unknown>;

interface Options {
	nodeValuesRoot?: Params;
	parameterDependencies?: Record<string, string[]>;
	onlySimpleTypes?: boolean;
	dataIsResolved?: boolean;
	parentType?: string;
}

function isRecord(value: unknown): value is Params {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** lodash `isEqual` for JSON values. */
function isEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
		return Number.isNaN(a) && Number.isNaN(b);
	}
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((v, k) => isEqual(v, b[k]));
	}
	if (!isRecord(a) || !isRecord(b)) return false;
	const ka = Object.keys(a);
	const kb = Object.keys(b);
	return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && isEqual(a[k], b[k]));
}

/** n8n's `deepCopy` for JSON values. */
function deepCopy<T>(value: T): T {
	return value === undefined ? value : structuredClone(value);
}

/** lodash `get` with a dotted path. */
function getPath(source: unknown, path: string): unknown {
	let cur: unknown = source;
	for (const part of path.split('.')) {
		if (!isRecord(cur) && !Array.isArray(cur)) return undefined;
		cur = Reflect.get(cur, part);
	}
	return cur;
}

function checkConditions(conditions: unknown[], actualValues: unknown[]): boolean {
	return conditions.some((condition) => {
		if (isRecord(condition) && isRecord(condition._cnd) && Object.keys(condition).length === 1) {
			const [key, targetValue] = Object.entries(condition._cnd)[0] ?? ['', undefined];
			if (actualValues.length === 0) return key === 'not';
			return actualValues.every((propertyValue) => {
				const n = Number(propertyValue);
				const t = Number(targetValue);
				switch (key) {
					case 'eq':
						return isEqual(propertyValue, targetValue);
					case 'not':
						return !isEqual(propertyValue, targetValue);
					case 'gte':
						return n >= t;
					case 'lte':
						return n <= t;
					case 'gt':
						return n > t;
					case 'lt':
						return n < t;
					case 'between': {
						const range = isRecord(targetValue) ? targetValue : {};
						return n >= Number(range.from) && n <= Number(range.to);
					}
					case 'includes':
						return typeof propertyValue === 'string' && propertyValue.includes(String(targetValue));
					case 'startsWith':
						return (
							typeof propertyValue === 'string' && propertyValue.startsWith(String(targetValue))
						);
					case 'endsWith':
						return typeof propertyValue === 'string' && propertyValue.endsWith(String(targetValue));
					case 'regex':
						try {
							return (
								typeof propertyValue === 'string' &&
								new RegExp(String(targetValue)).test(propertyValue)
							);
						} catch {
							return false;
						}
					case 'exists':
						return propertyValue !== null && propertyValue !== undefined && propertyValue !== '';
					default:
						return false;
				}
			});
		}
		return actualValues.includes(condition);
	});
}

function getPropertyValues(
	nodeValues: Params,
	propertyName: string,
	version: number,
	description: NodeDescription,
	nodeValuesRoot: Params,
): unknown[] {
	let value: unknown;
	if (propertyName.charAt(0) === '/') {
		value = getPath(nodeValuesRoot, propertyName.slice(1));
	} else if (propertyName === '@version') {
		value = version || 0;
	} else if (propertyName === '@tool') {
		value = description.name.endsWith('Tool');
	} else if (propertyName === '@feature') {
		if (!description.features || !version) return [];
		return Object.entries(description.features)
			.filter(([, condition]) => checkConditions(condition['@version'] ?? [], [version]))
			.map(([name]) => name);
	} else {
		value = getPath(nodeValues, propertyName);
	}
	if (isRecord(value) && '__rl' in value && value.__rl) value = value.value;
	return Array.isArray(value) ? value : [value];
}

function displayParameter(
	nodeValues: Params,
	parameter: NodeProperty,
	version: number,
	description: NodeDescription,
	nodeValuesRoot: Params,
): boolean {
	if (!parameter.displayOptions) return true;
	const { show, hide } = parameter.displayOptions;
	if (show) {
		for (const propertyName of Object.keys(show)) {
			const values = getPropertyValues(
				nodeValues,
				propertyName,
				version,
				description,
				nodeValuesRoot,
			);
			if (values.some((v) => typeof v === 'string' && v.charAt(0) === '=')) return true;
			if (!checkConditions(show[propertyName] ?? [], values)) return false;
		}
	}
	if (hide) {
		for (const propertyName of Object.keys(hide)) {
			const values = getPropertyValues(
				nodeValues,
				propertyName,
				version,
				description,
				nodeValuesRoot,
			);
			if (values.length !== 0 && checkConditions(hide[propertyName] ?? [], values)) return false;
		}
	}
	return true;
}

function getParameterDependencies(properties: NodeProperty[]): Record<string, string[]> {
	const dependencies: Record<string, string[]> = {};
	for (const { name, displayOptions } of properties) {
		dependencies[name] ??= [];
		if (!displayOptions) continue;
		for (const rule of Object.values(displayOptions)) {
			if (!isRecord(rule)) continue;
			for (const parameterName of Object.keys(rule)) {
				if (dependencies[name].includes(parameterName) || parameterName.charAt(0) === '@') continue;
				dependencies[name].push(parameterName);
			}
		}
	}
	return dependencies;
}

function getParameterResolveOrder(
	properties: NodeProperty[],
	dependencies: Record<string, string[]>,
): number[] {
	const executionOrder: number[] = [];
	const indexToResolve = Array.from({ length: properties.length }, (_, k) => k);
	const resolved: string[] = [];
	let lastIndexLength = indexToResolve.length;
	let lastIndexReduction = -1;
	let iterations = 0;
	while (indexToResolve.length !== 0) {
		iterations += 1;
		const index = indexToResolve.shift() ?? 0;
		const property = properties[index];
		const deps = dependencies[property.name] ?? [];
		if (deps.length === 0) {
			executionOrder.push(index);
			resolved.push(property.name);
			continue;
		}
		// As n8n-workflow 2.42.2: a missing dependency puts the index back, but the loop goes on.
		for (const dependency of deps) {
			if (!resolved.includes(dependency)) {
				if (!Object.hasOwn(dependencies, dependency)) continue;
				indexToResolve.push(index);
				continue;
			}
		}
		executionOrder.push(index);
		resolved.push(property.name);
		if (indexToResolve.length < lastIndexLength) lastIndexReduction = iterations;
		if (iterations > lastIndexReduction + properties.length) {
			throw new Error('Could not resolve parameter dependencies. Max iterations reached!');
		}
		lastIndexLength = indexToResolve.length;
	}
	return executionOrder;
}

/** `getNodeParameters` of n8n-workflow 2.42.2 (see the file comment). */
export function getNodeParameters(
	properties: NodeProperty[],
	nodeValues: Params | null,
	returnDefaults: boolean,
	returnNoneDisplayed: boolean,
	version: number,
	description: NodeDescription,
	options: Options = {},
): Params | null {
	let { nodeValuesRoot, parameterDependencies } = options;
	const { onlySimpleTypes = false, dataIsResolved = false, parentType } = options;
	parameterDependencies ??= getParameterDependencies(properties);

	const duplicateParameterNames: string[] = [];
	const parameterNames: string[] = [];
	for (const p of properties) {
		if (parameterNames.includes(p.name)) {
			if (!duplicateParameterNames.includes(p.name)) duplicateParameterNames.push(p.name);
		} else {
			parameterNames.push(p.name);
		}
	}

	const nodeParameters: Params = {};
	const nodeParametersFull: Params = {};
	let nodeValuesDisplayCheck: Params = nodeParametersFull;
	if (!dataIsResolved && !returnNoneDisplayed) {
		nodeValuesDisplayCheck =
			getNodeParameters(properties, nodeValues, true, true, version, description, {
				onlySimpleTypes: true,
				dataIsResolved: true,
				nodeValuesRoot,
				parentType,
				parameterDependencies,
			}) ?? {};
	}
	nodeValuesRoot ??= nodeValuesDisplayCheck;

	for (const parameterIndex of getParameterResolveOrder(properties, parameterDependencies)) {
		const p = properties[parameterIndex];
		const type = p.type ?? '';
		if (
			!nodeValues ||
			(nodeValues[p.name] === undefined && (!returnDefaults || parentType === 'collection'))
		) {
			continue;
		}
		const shown = () =>
			displayParameter(nodeValuesDisplayCheck, p, version, description, nodeValuesRoot ?? {});
		if (!returnNoneDisplayed && !shown()) {
			if (!returnNoneDisplayed || !returnDefaults) continue;
		}

		if (type !== 'collection' && type !== 'fixedCollection') {
			if (duplicateParameterNames.includes(p.name) && !shown()) continue;
			const value = nodeValues[p.name];
			if (returnDefaults) {
				if (type === 'boolean' || type === 'number' || type === 'options') {
					nodeParameters[p.name] = value !== undefined ? deepCopy(value) : p.default;
				} else if (type === 'resourceLocator' && isRecord(p.default)) {
					nodeParameters[p.name] =
						value !== undefined ? deepCopy(value) : { __rl: true, ...p.default };
				} else if (type === 'filter' && isRecord(value)) {
					const filter = deepCopy(value);
					filter.combinator ??= 'and';
					filter.options = {
						caseSensitive: true,
						leftValue: '',
						typeValidation: 'strict',
						version: 1,
						...(isRecord(filter.options) ? filter.options : {}),
					};
					nodeParameters[p.name] = filter;
				} else {
					nodeParameters[p.name] = deepCopy(value) ?? p.default;
				}
				nodeParametersFull[p.name] = nodeParameters[p.name];
			} else if (
				(value !== p.default && typeof value !== 'object') ||
				(typeof value === 'object' && !isEqual(value, p.default)) ||
				(value !== undefined && parentType === 'collection')
			) {
				nodeParameters[p.name] = deepCopy(value);
				nodeParametersFull[p.name] = nodeParameters[p.name];
				continue;
			}
		}

		if (onlySimpleTypes) continue;

		if (type === 'collection') {
			if (p.typeOptions?.multipleValues === true) {
				if (nodeValues[p.name] !== undefined) {
					nodeParameters[p.name] = deepCopy(nodeValues[p.name]);
				} else if (returnDefaults) {
					nodeParameters[p.name] = Array.isArray(p.default) ? deepCopy(p.default) : [];
				}
				nodeParametersFull[p.name] = nodeParameters[p.name];
			} else if (nodeValues[p.name] !== undefined) {
				const inner = nodeValues[p.name];
				const temp = getNodeParameters(
					p.options ?? [],
					isRecord(inner) ? inner : null,
					returnDefaults,
					returnNoneDisplayed,
					version,
					description,
					{ onlySimpleTypes: false, dataIsResolved: false, nodeValuesRoot, parentType: type },
				);
				if (temp !== null) {
					nodeParameters[p.name] = temp;
					nodeParametersFull[p.name] = temp;
				}
			} else if (returnDefaults) {
				nodeParameters[p.name] = deepCopy(p.default);
				nodeParametersFull[p.name] = nodeParameters[p.name];
			}
		} else if (type === 'fixedCollection') {
			const collectionValues: Params = {};
			let propertyValues: unknown = deepCopy(nodeValues[p.name]);
			if (returnDefaults && propertyValues === undefined) propertyValues = deepCopy(p.default);
			if (
				!returnDefaults &&
				p.typeOptions?.multipleValues === false &&
				isRecord(propertyValues) &&
				Object.keys(propertyValues).length === 0
			) {
				return deepCopy(nodeValues);
			}
			let hadAnyVisibleFields = false;
			const groups = isRecord(propertyValues) ? propertyValues : {};
			for (const itemName of Object.keys(groups)) {
				const option = (p.options ?? []).find((o) => o.name === itemName);
				if (p.typeOptions?.multipleValues === true) {
					if (option === undefined) continue;
					const list: Params[] = [];
					const items = groups[itemName];
					for (const nodeValue of Array.isArray(items) ? items : []) {
						const temp = getNodeParameters(
							option.values ?? [],
							isRecord(nodeValue) ? nodeValue : null,
							returnDefaults,
							returnNoneDisplayed,
							version,
							description,
							{ onlySimpleTypes: false, dataIsResolved: false, nodeValuesRoot, parentType: type },
						);
						if (temp !== null) list.push(temp);
					}
					collectionValues[itemName] = list;
				} else {
					const tempNodeParameters: Params = {};
					let hadVisibleFields = false;
					if (option !== undefined) {
						const values = option.values ?? [];
						const outer = nodeValues[p.name];
						const itemNodeValues = isRecord(outer) ? outer[itemName] : undefined;
						const temp = getNodeParameters(
							values,
							isRecord(itemNodeValues) ? itemNodeValues : null,
							returnDefaults,
							returnNoneDisplayed,
							version,
							description,
							{ onlySimpleTypes: false, dataIsResolved: false, nodeValuesRoot, parentType: type },
						);
						if (temp !== null) {
							Object.assign(tempNodeParameters, temp);
							if (Object.keys(temp).length > 0) {
								hadVisibleFields = true;
								hadAnyVisibleFields = true;
							} else {
								const hasNonDefaultValues =
									isRecord(itemNodeValues) &&
									Object.keys(itemNodeValues).some((key) => {
										const field = values.find((f) => f.name === key);
										return field && !isEqual(itemNodeValues[key], field.default);
									});
								if (!hasNonDefaultValues) {
									hadVisibleFields = true;
									hadAnyVisibleFields = true;
								}
							}
						}
					}
					if (Object.keys(tempNodeParameters).length !== 0) {
						collectionValues[itemName] = tempNodeParameters;
					} else if (!returnDefaults && hadVisibleFields && groups[itemName] !== undefined) {
						collectionValues[itemName] = tempNodeParameters;
					}
				}
			}
			if (
				!returnDefaults &&
				hadAnyVisibleFields &&
				p.typeOptions?.multipleValues === false &&
				Object.keys(collectionValues).length === 0 &&
				Object.keys(groups).length !== 0
			) {
				const returnValue: Params = {};
				for (const key of Object.keys(groups)) returnValue[key] = {};
				nodeParameters[p.name] = returnValue;
			}
			if (Object.keys(collectionValues).length !== 0 || returnDefaults) {
				nodeParameters[p.name] = collectionValues;
				nodeParametersFull[p.name] = collectionValues;
			}
		}
	}
	return nodeParameters;
}

/**
 * Removes from `raw` the members that `normalized` (the parameters as v1 holds them) does not
 * have, at every level. Values that stay keep their raw form.
 */
function prune(raw: unknown, normalized: unknown): unknown {
	if (Array.isArray(raw) && Array.isArray(normalized)) {
		return raw.map((v, k) => (k < normalized.length ? prune(v, normalized[k]) : v));
	}
	if (!isRecord(raw) || !isRecord(normalized)) return raw;
	// A resource locator or a filter value is one parameter: v1 keeps it whole.
	if ('__rl' in raw) return raw;
	const out: Params = {};
	for (const [key, value] of Object.entries(raw)) {
		if (!Object.hasOwn(normalized, key)) continue;
		out[key] = prune(value, normalized[key]);
	}
	return out;
}

/** The description of a node type at a version, when the generated file has it. */
export function nodeDescription(type: string, version: number): NodeDescription | undefined {
	const key = NODE_DESCRIPTION_VERSIONS[`${type}@${version}`];
	return key === undefined ? undefined : NODE_DESCRIPTIONS[key];
}

/**
 * The parameters of a node without the ones that its node type hides at its version, as the
 * `Workflow` constructor of n8n leaves them. Unknown types and versions keep all parameters.
 */
export function hideParameters(type: string, version: number, parameters: Params): Params {
	const description = nodeDescription(type, version);
	if (!description) return parameters;
	const normalized = getNodeParameters(
		description.properties,
		parameters,
		true,
		false,
		version,
		description,
	);
	const out = prune(parameters, normalized ?? {});
	return isRecord(out) ? out : parameters;
}

/**
 * Parameter strings that start with `=` and have no `{{ }}`: n8n evaluates them to the text
 * after the `=` (for example a body type `=json` is `json`). The lowerers compare such
 * parameters as text, so the converter gives them the value that v1 reads.
 */
export function resolvePlainExpressions(value: unknown): unknown {
	if (typeof value === 'string') {
		return value.startsWith('=') && !value.includes('{{') ? value.slice(1) : value;
	}
	if (Array.isArray(value)) return value.map(resolvePlainExpressions);
	if (!isRecord(value)) return value;
	const out: Params = {};
	for (const [key, v] of Object.entries(value)) out[key] = resolvePlainExpressions(v);
	return out;
}
