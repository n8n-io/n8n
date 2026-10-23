import type { Overrides, OperationConfig } from 'n8n-nodes-base/nodes/N8n/v2/define-overrides';
import { operationName, resourceName } from './naming';
import { OVERRIDES_FILE } from './paths';
import type {
	ApiParameter,
	Contract,
	ContractOperation,
	Field,
	Placement,
	ResolvedOperation,
	SpecOperation,
} from './types';

const RESERVED_NAMES = new Set([
	'resource',
	'operation',
	'returnAll',
	'limit',
	'options',
	'additionalFields',
]);

export const emptyContract = (): Contract => ({ operations: {}, excluded: {} });

function defaultPlacement(parameter: ApiParameter): Placement {
	if (parameter.required || parameter.location === 'flattened') return 'root';
	return parameter.location === 'query' ? 'options' : 'additionalFields';
}

function distance(a: string, b: string) {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const current = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
			previous = current;
		}
	}
	return row[b.length];
}

function didYouMean(value: string, candidates: string[]) {
	const [closest] = [...candidates].sort((x, y) => distance(value, x) - distance(value, y));
	return closest && distance(value, closest) <= Math.max(3, value.length / 3)
		? ` Did you mean "${closest}"?`
		: '';
}

function flatten(parameters: ApiParameter[], parent: string | undefined): ApiParameter[] {
	if (!parent) return parameters;
	return parameters.flatMap((parameter) => {
		const items = parameter.schema.items;
		if (parameter.name !== parent || parameter.location !== 'body' || !items?.properties)
			return [parameter];
		return Object.entries(items.properties).map(([name, schema]) => ({
			wire: `body:${parent}[].${name}`,
			name,
			location: 'flattened' as const,
			parent,
			required: (items.required ?? []).includes(name),
			schema,
			description: schema.description,
		}));
	});
}

function resolveFields(
	parameters: ApiParameter[],
	operationConfig: OperationConfig | undefined,
	remembered: ContractOperation | undefined,
): Field[] {
	const nameByWire = new Map<string, string>();
	for (const [name, p] of Object.entries(remembered?.params ?? {})) nameByWire.set(p.api, name);
	for (const [name, p] of Object.entries(operationConfig?.params ?? {}))
		if (p.api) nameByWire.set(p.api, name);

	const taken = new Set<string>();
	return parameters.map((parameter) => {
		let nodeName = nameByWire.get(parameter.wire) ?? parameter.name;
		while (RESERVED_NAMES.has(nodeName) || taken.has(nodeName)) nodeName = `${nodeName}Value`;
		taken.add(nodeName);
		const placement =
			operationConfig?.params?.[nodeName]?.placement ??
			remembered?.params[nodeName]?.placement ??
			defaultPlacement(parameter);
		return { ...parameter, nodeName, placement };
	});
}

function validateConfig(
	config: Overrides,
	specOperations: SpecOperation[],
	resolved: ResolvedOperation[],
) {
	const errors: string[] = [];
	const operationIds = specOperations.map((op) => op.operationId);
	const keys = resolved.map((op) => op.key);
	const resources = [...new Set(resolved.map((op) => op.resource))];

	for (const entry of config.include ?? []) {
		if (!resources.includes(entry) && !keys.includes(entry)) {
			errors.push(
				`"include" names "${entry}", which is neither a resource nor a node operation.${didYouMean(entry, [...resources, ...keys])}`,
			);
		}
	}

	for (const operationId of Object.keys(config.exclude ?? {})) {
		if (!operationIds.includes(operationId)) {
			errors.push(
				`"exclude" names the API operation "${operationId}", which is not in the spec.${didYouMean(operationId, operationIds)}`,
			);
		}
	}

	for (const [key, operationConfig] of Object.entries(config.operations ?? {})) {
		if (operationConfig.api && !operationIds.includes(operationConfig.api)) {
			errors.push(
				`"operations.${key}.api" names "${operationConfig.api}", which is not in the spec.${didYouMean(operationConfig.api, operationIds)}`,
			);
			continue;
		}
		const operation = resolved.find((op) => op.key === key);
		if (!operation) {
			errors.push(
				`"operations" names the node operation "${key}", which does not exist.${didYouMean(key, keys)}`,
			);
			continue;
		}
		const fieldNames = operation.fields.map((f) => f.nodeName);
		const wires = operation.parameters.map((p) => p.wire);
		for (const [name, paramConfig] of Object.entries(operationConfig.params ?? {})) {
			if (paramConfig.api && !wires.includes(paramConfig.api)) {
				errors.push(
					`"operations.${key}.params.${name}.api" names "${paramConfig.api}", which "${operation.operationId}" does not have.${didYouMean(paramConfig.api, wires)}`,
				);
			} else if (!fieldNames.includes(name)) {
				errors.push(
					`"operations.${key}.params" names "${name}", which "${key}" does not have.${didYouMean(name, fieldNames)}`,
				);
			}
		}
	}

	return errors.map((error) => `${OVERRIDES_FILE}: ${error}`);
}

export function resolveOperations(
	specOperations: SpecOperation[],
	config: Overrides,
	previous: Contract,
) {
	const keyByOperationId = new Map<string, string>();
	for (const [key, op] of Object.entries(previous.operations)) keyByOperationId.set(op.api, key);
	for (const [key, op] of Object.entries(config.operations ?? {}))
		if (op.api) keyByOperationId.set(op.api, key);

	const excluded: Record<string, string> = {};
	const resolved: ResolvedOperation[] = [];
	const usedKeys = new Set<string>();

	for (const op of specOperations) {
		const reason = config.exclude?.[op.operationId] ?? op.unsupported;
		if (reason) {
			excluded[op.operationId] = reason;
			continue;
		}
		const resource = resourceName(op.tag);
		let key =
			keyByOperationId.get(op.operationId) ??
			`${resource}:${operationName(op.operationId, resource, op.paginated)}`;
		if (usedKeys.has(key)) key = `${resource}:${op.operationId}`;
		usedKeys.add(key);

		const [keyResource, operation] = key.split(':');
		const operationConfig = config.operations?.[key];
		const parameters = flatten(op.parameters, operationConfig?.flatten);
		resolved.push({
			...op,
			parameters,
			key,
			resource: keyResource,
			operation,
			fields: resolveFields(parameters, operationConfig, previous.operations[key]),
		});
	}

	const isIncluded = (op: ResolvedOperation) =>
		!config.include || config.include.includes(op.resource) || config.include.includes(op.key);

	return {
		resolved: resolved.filter(isIncluded),
		pending: resolved.filter((op) => !isIncluded(op)),
		excluded,
		errors: validateConfig(config, specOperations, resolved),
	};
}

export function toContract(
	resolved: ResolvedOperation[],
	excluded: Record<string, string>,
	details: Record<string, Record<string, { shape: string; default: unknown }>>,
): Contract {
	const sortKeys = <T>(object: Record<string, T>) =>
		Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
	const operations: Record<string, ContractOperation> = {};
	for (const op of resolved) {
		operations[op.key] = {
			api: op.operationId,
			params: Object.fromEntries(
				op.fields.map((f) => [
					f.nodeName,
					{ api: f.wire, placement: f.placement, ...details[op.key][f.nodeName] },
				]),
			),
		};
	}
	return { operations: sortKeys(operations), excluded: sortKeys(excluded) };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function diffContracts(base: Contract, next: Contract) {
	const changes: string[] = [];
	const breaking: string[] = [];

	for (const [key, op] of Object.entries(next.operations)) {
		const before = base.operations[key];
		if (!before) {
			changes.push(`+ ${key} (${op.api})`);
			continue;
		}
		const added = Object.entries(op.params).filter(([name]) => !(name in before.params));
		for (const [name] of added) changes.push(`+ ${key}: parameter "${name}"`);

		for (const [name, old] of Object.entries(before.params)) {
			const now = op.params[name];
			if (!now) {
				const hint = added.length
					? ` If the API renamed it, add to ${OVERRIDES_FILE}: operations: { '${key}': { params: { ${name}: { api: '${added[0][1].api}' } } } }.`
					: '';
				breaking.push(`${key}: parameter "${name}" was removed.${hint}`);
				continue;
			}
			if (old.api !== now.api) changes.push(`~ ${key}: parameter "${name}" now reads ${now.api}`);
			if (old.placement !== now.placement) {
				breaking.push(
					`${key}: parameter "${name}" moved from "${old.placement}" to "${now.placement}". To keep it, add to ${OVERRIDES_FILE}: operations: { '${key}': { params: { ${name}: { placement: '${old.placement}' } } } }.`,
				);
			}
			if (old.shape !== now.shape)
				breaking.push(
					`${key}: parameter "${name}" changes its stored format from "${old.shape}" to "${now.shape}".`,
				);
			if (!same(old.default, now.default)) {
				breaking.push(
					`${key}: parameter "${name}" changes its default from ${JSON.stringify(old.default)} to ${JSON.stringify(now.default)}. Workflows that kept the default do not store a value.`,
				);
			}
		}
	}

	for (const [key, op] of Object.entries(base.operations)) {
		if (key in next.operations) continue;
		const newKey = Object.entries(next.operations).find(
			([k, o]) => o.api === op.api && !(k in base.operations),
		)?.[0];
		const hint = newKey
			? ` It is now "${newKey}". To keep the old name, add to ${OVERRIDES_FILE}: operations: { '${key}': { api: '${op.api}' } }.`
			: ` If the API renamed "${op.api}", add to ${OVERRIDES_FILE}: operations: { '${key}': { api: '<new operationId>' } }.`;
		breaking.push(`${key}: operation was removed.${hint}`);
	}

	return { changes, breaking };
}
