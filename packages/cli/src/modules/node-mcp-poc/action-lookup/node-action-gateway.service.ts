import { Service } from '@n8n/di';
import {
	isSafeObjectProperty,
	setSafeObjectProperty,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyMode,
	type NodeParameterValue,
	type NodeParameterValueType,
} from 'n8n-workflow';

import { NodeToolExecutorService } from '../json-schema/node-tool-executor.service';
import { NodeToolResolverService } from '../json-schema/node-tool-resolver.service';
import type {
	CompiledActionPlan,
	ResolveNodeParameterInput,
	ResolveNodeParameterResult,
} from './action-lookup.types';
import { fieldFromResourceMapper } from './node-action-compiler';
import { VisibleActionCatalogRegistry } from './visible-action-catalog';

function isScalar(value: unknown): value is NodeParameterValue {
	return (
		value === null ||
		value === undefined ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNodeParameterValue(value: unknown): NodeParameterValueType {
	if (isScalar(value)) return value;
	if (Array.isArray(value)) {
		if (value.every(isScalar)) return value;
		if (value.every(isPlainObject)) return value.map(toNodeParameters);
		throw new Error('Node parameter arrays must contain only scalars or only objects');
	}
	if (!isPlainObject(value)) throw new Error('Unsupported node parameter value');
	return toNodeParameters(value);
}

function toNodeParameters(value: Record<string, unknown>): INodeParameters {
	const result: INodeParameters = {};
	for (const [key, child] of Object.entries(value)) {
		if (!isSafeObjectProperty(key)) throw new Error(`Unsafe node parameter key: ${key}`);
		setSafeObjectProperty(result, key, toNodeParameterValue(child));
	}
	return result;
}

function isPropertyCollection(value: unknown): value is INodePropertyCollection {
	return typeof value === 'object' && value !== null && 'values' in value && 'name' in value;
}

function preferredLocatorMode(modes: readonly INodePropertyMode[], value: NodeParameterValue) {
	const text = String(value);
	const urlMode = modes.find(
		(mode) => mode.name.toLowerCase().includes('url') || mode.type.toLowerCase().includes('url'),
	);
	if (/^https?:\/\//i.test(text) && urlMode) return urlMode.name;
	const idMode = modes.find((mode) => mode.name.toLowerCase().includes('id'));
	if (idMode) return idMode.name;
	const listMode = modes.find((mode) => mode.type === 'list');
	return listMode?.name ?? modes[0]?.name ?? 'id';
}

function normalizePropertyValue(
	property: INodeProperties,
	value: NodeParameterValueType,
): NodeParameterValueType {
	if (property.type === 'resourceLocator' && isScalar(value)) {
		return {
			mode: preferredLocatorMode(property.modes ?? [], value),
			value,
		};
	}
	if (property.type === 'resourceMapper' && isPlainObject(value)) {
		return {
			mappingMode: 'defineBelow',
			value: toNodeParameters(value),
		};
	}
	if (property.type === 'collection' && isPlainObject(value)) {
		const result = toNodeParameters(value);
		for (const child of (property.options ?? []).filter(
			(option): option is INodeProperties =>
				typeof option === 'object' && option !== null && 'type' in option,
		)) {
			if (!Object.hasOwn(result, child.name)) continue;
			setSafeObjectProperty(result, child.name, normalizePropertyValue(child, result[child.name]));
		}
		return result;
	}
	if (property.type === 'fixedCollection' && isPlainObject(value)) {
		const result = toNodeParameters(value);
		for (const option of (property.options ?? []).filter(isPropertyCollection)) {
			if (!Object.hasOwn(result, option.name)) continue;
			const optionValue = result[option.name];
			const entries = Array.isArray(optionValue) ? optionValue : [optionValue];
			const normalized = entries.map((entry) => {
				if (!isPlainObject(entry)) return entry;
				const item = toNodeParameters(entry);
				for (const child of option.values) {
					if (!Object.hasOwn(item, child.name)) continue;
					setSafeObjectProperty(item, child.name, normalizePropertyValue(child, item[child.name]));
				}
				return item;
			});
			setSafeObjectProperty(
				result,
				option.name,
				Array.isArray(optionValue) ? normalized : normalized[0],
			);
		}
		return result;
	}
	return value;
}

function normalizeInput(plan: CompiledActionPlan, input: Record<string, unknown>) {
	const normalized = toNodeParameters(input);
	const seen = new Set<string>();
	for (const property of plan.tool.properties) {
		if (seen.has(property.name) || !Object.hasOwn(normalized, property.name)) continue;
		seen.add(property.name);
		setSafeObjectProperty(
			normalized,
			property.name,
			normalizePropertyValue(property, normalized[property.name]),
		);
	}
	return normalized;
}

function publicPath(plan: CompiledActionPlan, path: string) {
	for (const resourcePath of plan.resourceModesByPath.keys()) {
		if (path === `${resourcePath}.value` || path === `${resourcePath}.mode`) return resourcePath;
	}
	return path;
}

function nextParameters(plan: CompiledActionPlan, parameter: string) {
	return plan.dynamicParameters
		.filter((descriptor) =>
			descriptor.dependencies.some((dependency) => publicPath(plan, dependency) === parameter),
		)
		.map((descriptor) => descriptor.path);
}

@Service()
export class NodeActionGatewayService {
	constructor(
		private readonly catalogs: VisibleActionCatalogRegistry,
		private readonly resolver: NodeToolResolverService,
		private readonly executor: NodeToolExecutorService,
	) {}

	getCatalog(endpoint: string) {
		const catalog = this.catalogs.get(endpoint);
		if (!catalog) throw new Error(`Unknown node MCP POC endpoint: ${endpoint}`);
		return catalog;
	}

	search(endpoint: string, query: string, limit: number, cursor?: string) {
		return this.catalogs.search(this.getCatalog(endpoint), query, limit, cursor);
	}

	get(endpoint: string, actionId: string) {
		return this.catalogs.findAction(this.getCatalog(endpoint), actionId).definition;
	}

	async resolve(
		endpoint: string,
		input: ResolveNodeParameterInput,
	): Promise<ResolveNodeParameterResult> {
		const plan = this.catalogs.findAction(this.getCatalog(endpoint), input.actionId);
		const knownInput = normalizeInput(plan, input.knownInput);
		const result = await this.resolver.resolve(
			plan.toolset,
			plan.tool,
			input.parameter,
			knownInput,
			input.query,
			input.cursor,
		);
		if (result.kind === 'needsInput') {
			return {
				status: 'needsInput',
				parameter: input.parameter,
				missing: [...new Set((result.missing ?? []).map((path) => publicPath(plan, path)))],
			};
		}
		return {
			status: 'resolved',
			parameter: input.parameter,
			options: (result.values ?? []).map((option) => ({
				label: option.name,
				value: option.value,
				...(option.description ? { description: option.description } : {}),
			})),
			field: result.fields
				? {
						...plan.definition.input.fields.find((field) => field.name === input.parameter),
						name: input.parameter,
						label:
							plan.definition.input.fields.find((field) => field.name === input.parameter)?.label ??
							input.parameter,
						type: 'object',
						required:
							plan.definition.input.fields.find((field) => field.name === input.parameter)
								?.required ?? false,
						fields: result.fields
							.filter(
								(field) => field.id !== 'autoMapInputData' && field.display && !field.readOnly,
							)
							.map(fieldFromResourceMapper),
					}
				: null,
			next: nextParameters(plan, input.parameter),
			nextCursor: result.paginationToken ?? null,
		};
	}

	async run(endpoint: string, actionId: string, input: Record<string, unknown>) {
		const plan = this.catalogs.findAction(this.getCatalog(endpoint), actionId);
		const result = await this.executor.execute(
			plan.toolset,
			plan.tool,
			normalizeInput(plan, input),
		);
		if (result.status === 'error') {
			throw new Error(result.error ?? 'Node execution failed');
		}
		return {
			status: 'succeeded' as const,
			actionId,
			output: { items: result.data },
		};
	}
}
