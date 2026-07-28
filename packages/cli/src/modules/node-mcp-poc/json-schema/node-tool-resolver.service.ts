import { Service } from '@n8n/di';
import {
	isSafeObjectProperty,
	setSafeObjectProperty,
	type INodeCredentials,
	type INodeParameters,
	type NodeParameterValue,
	type NodeParameterValueType,
	type ResourceMapperField,
} from 'n8n-workflow';

import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

import type {
	CompiledNodeToolset,
	CompiledOperationTool,
	DynamicParameterDescriptor,
	DynamicResolutionResult,
} from './node-mcp-poc.types';

function isNodeParameters(value: unknown): value is INodeParameters {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every(
			(child) =>
				child === null ||
				child === undefined ||
				['string', 'number', 'boolean'].includes(typeof child) ||
				Array.isArray(child) ||
				(typeof child === 'object' && child !== null),
		)
	);
}

function getPath(value: INodeParameters, path: string): unknown {
	let current: unknown = value;
	for (const segment of path.split('.')) {
		if (typeof current !== 'object' || current === null || !(segment in current)) return undefined;
		current = Reflect.get(current, segment);
	}
	return current;
}

function setPath(value: INodeParameters, path: string, child: NodeParameterValueType) {
	const segments = path.split('.');
	let current = value;
	for (const segment of segments.slice(0, -1)) {
		if (!isSafeObjectProperty(segment)) throw new Error(`Unsafe parameter path: ${segment}`);
		const existing = current[segment];
		if (isNodeParameters(existing)) {
			current = existing;
		} else {
			const next: INodeParameters = {};
			setSafeObjectProperty(current, segment, next);
			current = next;
		}
	}
	const leaf = segments.at(-1);
	if (!leaf || !isSafeObjectProperty(leaf)) throw new Error(`Unsafe parameter path: ${leaf ?? ''}`);
	setSafeObjectProperty(current, leaf, child);
}

function isScalar(value: unknown): value is NodeParameterValue {
	return (
		value === null ||
		value === undefined ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

function asInternalResourceLocator(value: unknown): INodeParameters | undefined {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
	const mode = Reflect.get(value, 'mode');
	const locatorValue = Reflect.get(value, 'value');
	if (typeof mode !== 'string' || !isScalar(locatorValue)) return undefined;
	return { __rl: true, mode, value: locatorValue };
}

function internalizeResourceLocators(
	tool: CompiledOperationTool,
	values: INodeParameters,
): INodeParameters {
	const internalValues = structuredClone(values);
	for (const descriptor of tool.dynamicParameters) {
		if (descriptor.property.type !== 'resourceLocator') continue;
		const locator = asInternalResourceLocator(getPath(internalValues, descriptor.path));
		if (locator) setPath(internalValues, descriptor.path, locator);
	}
	return internalValues;
}

function dependenciesMissing(descriptor: DynamicParameterDescriptor, values: INodeParameters) {
	return descriptor.dependencies.filter((path) => getPath(values, path) === undefined);
}

function credentialsFor(toolset: CompiledNodeToolset): INodeCredentials {
	const credentials: INodeCredentials = {};
	for (const [type, details] of Object.entries(toolset.endpoint.binding.credentials)) {
		credentials[type] = details;
	}
	return credentials;
}

function optionResult(
	descriptor: DynamicParameterDescriptor,
	options: Array<{
		name: string;
		value: string | number | boolean;
		description?: string;
		url?: string;
	}>,
	paginationToken?: string,
): DynamicResolutionResult {
	return {
		kind: descriptor.kind === 'listSearch' ? 'resourceLocator' : 'options',
		appliesTo: descriptor.path,
		values: options.map((option) => ({
			name: String(option.name),
			value: option.value,
			description: option.description,
			url: option.url,
		})),
		paginationToken,
	};
}

@Service()
export class NodeToolResolverService {
	private readonly resourceMapperSchemas = new Map<string, ResourceMapperField[]>();

	constructor(private readonly dynamicNodeParametersService: DynamicNodeParametersService) {}

	private schemaKey(
		toolset: CompiledNodeToolset,
		tool: CompiledOperationTool,
		descriptor: DynamicParameterDescriptor,
		values: INodeParameters,
	) {
		const dependencies = descriptor.dependencies.map((path) => [path, getPath(values, path)]);
		return `${toolset.endpoint.endpoint}:${tool.name}:${descriptor.path}:${JSON.stringify(dependencies)}`;
	}

	getResourceMapperSchema(
		toolset: CompiledNodeToolset,
		tool: CompiledOperationTool,
		path: string,
		values: INodeParameters,
	) {
		const descriptor = this.findDescriptor(tool, path);
		if (!descriptor) return undefined;
		return this.resourceMapperSchemas.get(this.schemaKey(toolset, tool, descriptor, values));
	}

	findDescriptor(tool: CompiledOperationTool, path: string) {
		return tool.dynamicParameters.find((descriptor) => descriptor.path === path);
	}

	async resolve(
		toolset: CompiledNodeToolset,
		tool: CompiledOperationTool,
		path: string,
		knownValues: INodeParameters,
		filter?: string,
		paginationToken?: string,
	): Promise<DynamicResolutionResult> {
		const descriptor = this.findDescriptor(tool, path);
		if (!descriptor) throw new Error(`Parameter "${path}" is not dynamically resolvable`);
		const missing = dependenciesMissing(descriptor, knownValues);
		if (missing.length > 0) {
			return { kind: 'needsInput', appliesTo: path, missing };
		}

		const currentNodeParameters: INodeParameters = {
			...internalizeResourceLocators(tool, knownValues),
			...(toolset.endpoint.binding.fixedParameters ?? {}),
		};
		if (tool.resource !== undefined) currentNodeParameters.resource = tool.resource;
		if (tool.operation !== undefined) currentNodeParameters.operation = tool.operation;

		const additionalData = await getBase({
			userId: toolset.endpoint.binding.userId,
			projectId: toolset.endpoint.binding.projectId,
			currentNodeParameters,
		});
		additionalData.dataTableProjectId = toolset.endpoint.binding.projectId;
		const nodeTypeAndVersion = {
			name: toolset.endpoint.binding.nodeType,
			version: toolset.endpoint.binding.nodeVersion,
		};
		const credentials = credentialsFor(toolset);

		switch (descriptor.kind) {
			case 'listSearch': {
				if (!descriptor.methodName) throw new Error(`Resolver method missing for "${path}"`);
				const result = await this.dynamicNodeParametersService.getResourceLocatorResults(
					descriptor.methodName,
					descriptor.path,
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
					filter,
					paginationToken,
				);
				return optionResult(
					descriptor,
					result.results ?? [],
					typeof result.paginationToken === 'string' ? result.paginationToken : undefined,
				);
			}
			case 'loadOptions': {
				if (!descriptor.methodName) throw new Error(`Resolver method missing for "${path}"`);
				const result = await this.dynamicNodeParametersService.getOptionsViaMethodName(
					descriptor.methodName,
					descriptor.path,
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
				);
				return optionResult(descriptor, result);
			}
			case 'declarativeOptions': {
				const result = await this.dynamicNodeParametersService.getOptionsViaLoadOptionsByPath(
					descriptor.path,
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
				);
				return optionResult(descriptor, result);
			}
			case 'resourceMapper': {
				if (!descriptor.methodName) throw new Error(`Resolver method missing for "${path}"`);
				const result = await this.dynamicNodeParametersService.getResourceMappingFields(
					descriptor.methodName,
					descriptor.path,
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
				);
				this.resourceMapperSchemas.set(
					this.schemaKey(toolset, tool, descriptor, currentNodeParameters),
					result.fields,
				);
				return {
					kind: 'resourceMapperFields',
					appliesTo: descriptor.path,
					fields: result.fields,
				};
			}
			case 'localResourceMapper': {
				if (!descriptor.methodName) throw new Error(`Resolver method missing for "${path}"`);
				const result = await this.dynamicNodeParametersService.getLocalResourceMappingFields(
					descriptor.methodName,
					descriptor.path,
					additionalData,
					nodeTypeAndVersion,
				);
				this.resourceMapperSchemas.set(
					this.schemaKey(toolset, tool, descriptor, currentNodeParameters),
					result.fields,
				);
				return {
					kind: 'resourceMapperFields',
					appliesTo: descriptor.path,
					fields: result.fields,
				};
			}
		}
	}

	async resolveBatch(
		toolset: CompiledNodeToolset,
		tool: CompiledOperationTool,
		knownValues: INodeParameters,
		queries: Record<string, string> = {},
	) {
		const working: INodeParameters = structuredClone(knownValues);
		const resolved: Record<string, unknown> = {};
		const schemas: Record<string, unknown[]> = {};
		const choicesRequired: DynamicResolutionResult[] = [];
		const pending = new Map(
			tool.dynamicParameters.map((descriptor) => [descriptor.path, descriptor]),
		);

		let progressed = true;
		while (progressed && pending.size > 0) {
			progressed = false;
			const ready = Array.from(pending.values()).filter(
				(descriptor) => dependenciesMissing(descriptor, working).length === 0,
			);
			const results = await Promise.all(
				ready.map(
					async (descriptor) =>
						[
							descriptor,
							await this.resolve(toolset, tool, descriptor.path, working, queries[descriptor.path]),
						] as const,
				),
			);
			for (const [descriptor, result] of results) {
				if (result.fields) {
					schemas[descriptor.path] = result.fields;
					pending.delete(descriptor.path);
					progressed = true;
					continue;
				}
				if (queries[descriptor.path] !== undefined && result.values?.length === 1) {
					const value = result.values[0].value;
					const selected: NodeParameterValueType =
						descriptor.kind === 'listSearch' ? { mode: 'list', value } : value;
					setPath(working, descriptor.path, selected);
					resolved[descriptor.path] = selected;
					pending.delete(descriptor.path);
					progressed = true;
					continue;
				}
				choicesRequired.push(result);
			}
			if (choicesRequired.length > 0) break;
		}

		return {
			resolved,
			schemas,
			choicesRequired,
			remaining: Array.from(pending.keys()),
		};
	}
}
