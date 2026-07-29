import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import {
	isSafeObjectProperty,
	NodeHelpers,
	setSafeObjectProperty,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodeTypeDescription,
	type NodeParameterValue,
	type NodeParameterValueType,
	type ResourceMapperField,
} from 'n8n-workflow';

import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import { NodeTypes } from '@/node-types';

import { executeNodeMcpEvalFixture } from '../evaluations/eval-context';
import type { CompiledNodeToolset, CompiledOperationTool } from './node-mcp-poc.types';
import { NodeToolResolverService } from './node-tool-resolver.service';

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

function isNodeParameterValue(value: unknown): value is NodeParameterValueType {
	if (isScalar(value)) return true;
	if (Array.isArray(value)) return value.every(isNodeParameterValue);
	return isPlainObject(value) && Object.values(value).every(isNodeParameterValue);
}

function isNodeParameters(value: unknown): value is INodeParameters {
	return isPlainObject(value) && Object.values(value).every(isNodeParameterValue);
}

function sanitizeObject(value: object): INodeParameters {
	const result: INodeParameters = {};
	for (const [key, child] of Object.entries(value)) {
		if (!isSafeObjectProperty(key)) throw new Error(`Unsafe node parameter key: ${key}`);
		setSafeObjectProperty(result, key, sanitizeValue(child));
	}
	return result;
}

function sanitizeValue(value: unknown): NodeParameterValueType {
	if (isScalar(value)) {
		if (typeof value === 'string' && value.startsWith('=')) {
			throw new Error('n8n expressions are not accepted by the node MCP POC');
		}
		return value;
	}
	if (Array.isArray(value)) {
		if (value.every(isScalar)) return value;
		if (value.every(isPlainObject)) {
			return value.map((item) => sanitizeObject(item));
		}
		throw new Error('Node parameter arrays must contain only scalars or only objects');
	}
	if (typeof value !== 'object') throw new Error('Unsupported node parameter value');
	return sanitizeObject(value);
}

function sanitizeArguments(argumentsValue: Record<string, unknown>): INodeParameters {
	return sanitizeObject(argumentsValue);
}

function isNodeProperty(value: unknown): value is INodeProperties {
	return typeof value === 'object' && value !== null && 'type' in value && 'name' in value;
}

function isPropertyCollection(value: unknown): value is INodePropertyCollection {
	return typeof value === 'object' && value !== null && 'values' in value && 'name' in value;
}

const NON_EXECUTION_INPUT_TYPES = new Set([
	'button',
	'callout',
	'credentials',
	'credentialsSelect',
	'curlImport',
	'icon',
	'notice',
]);

function isExecutionInputProperty(value: unknown): value is INodeProperties {
	return isNodeProperty(value) && !NON_EXECUTION_INPUT_TYPES.has(value.type);
}

function applyDefaultsAndValidate(
	properties: INodeProperties[],
	values: INodeParameters,
	rootValues: INodeParameters,
	version: number,
	description: INodeTypeDescription,
) {
	const visibility = properties.map((property) => ({
		property,
		visible:
			(!property.envFeatureFlag ||
				['1', 'true'].includes(
					process.env[`N8N_ENV_FEAT_${property.envFeatureFlag}`]?.toLowerCase() ?? '',
				)) &&
			NodeHelpers.displayParameter(
				values,
				property,
				{ typeVersion: version },
				description,
				rootValues,
			),
	}));
	for (const { property, visible } of visibility) {
		if (
			property.envFeatureFlag &&
			!['1', 'true'].includes(
				process.env[`N8N_ENV_FEAT_${property.envFeatureFlag}`]?.toLowerCase() ?? '',
			)
		) {
			continue;
		}
		const anotherVariantIsVisible = visibility.some(
			(candidate) =>
				candidate.property !== property &&
				candidate.property.name === property.name &&
				candidate.visible,
		);
		if (Object.hasOwn(values, property.name) && !visible && !anotherVariantIsVisible) {
			throw new Error(`Parameter "${property.name}" is hidden for the selected operation`);
		}
		if (visible && !Object.hasOwn(values, property.name) && property.default !== undefined) {
			setSafeObjectProperty(values, property.name, property.default);
		}
		if (visible && property.required && !Object.hasOwn(values, property.name)) {
			throw new Error(`Required parameter "${property.name}" is missing`);
		}
		if (!visible || !Object.hasOwn(values, property.name)) continue;
		const propertyValue = values[property.name];
		if (property.type === 'collection' && isNodeParameters(propertyValue)) {
			applyDefaultsAndValidate(
				(property.options ?? []).filter(isExecutionInputProperty),
				propertyValue,
				rootValues,
				version,
				description,
			);
		}
		if (property.type === 'fixedCollection' && isPlainObject(propertyValue)) {
			for (const option of (property.options ?? []).filter(isPropertyCollection)) {
				const optionValue = Reflect.get(propertyValue, option.name);
				const entries = Array.isArray(optionValue) ? optionValue : [optionValue];
				for (const entry of entries) {
					if (isNodeParameters(entry)) {
						applyDefaultsAndValidate(
							option.values.filter(isExecutionInputProperty),
							entry,
							rootValues,
							version,
							description,
						);
					}
				}
			}
		}
	}
}

function normalizePropertyValue(
	property: INodeProperties,
	value: NodeParameterValueType,
	mapperSchema: ResourceMapperField[] | undefined,
): NodeParameterValueType {
	if (property.type === 'resourceLocator' && isPlainObject(value)) {
		const mode = Reflect.get(value, 'mode');
		const locatorValue = Reflect.get(value, 'value');
		if (!isScalar(mode) || !isScalar(locatorValue)) {
			throw new Error(`Invalid resource locator value for "${property.name}"`);
		}
		return {
			__rl: true,
			mode,
			value: locatorValue,
		};
	}
	if (property.type === 'resourceMapper' && isPlainObject(value)) {
		if (!mapperSchema) {
			throw new Error(`Resolve "${property.name}" before executing this tool`);
		}
		return { ...sanitizeObject(value), schema: sanitizeValue(mapperSchema) };
	}
	if (property.type === 'assignmentCollection' && Array.isArray(value)) {
		return {
			assignments: value.map((assignment) => {
				if (!isPlainObject(assignment)) {
					throw new Error(`Invalid assignment value for "${property.name}"`);
				}
				return { id: randomUUID(), ...sanitizeObject(assignment) };
			}),
		};
	}
	if (property.type === 'filter' && isPlainObject(value)) {
		const filter = property.typeOptions?.filter;
		return {
			...sanitizeObject(value),
			options: {
				version: typeof filter?.version === 'number' ? filter.version : 1,
				caseSensitive: typeof filter?.caseSensitive === 'boolean' ? filter.caseSensitive : true,
				typeValidation:
					typeof filter?.typeValidation === 'string' ? filter.typeValidation : 'strict',
			},
		};
	}
	if (property.type === 'collection' && isPlainObject(value)) {
		const children = (property.options ?? []).filter(
			(option): option is INodeProperties => 'type' in option,
		);
		const result = sanitizeObject(value);
		for (const child of children) {
			if (!Object.hasOwn(result, child.name)) continue;
			setSafeObjectProperty(
				result,
				child.name,
				normalizePropertyValue(child, result[child.name], undefined),
			);
		}
		return result;
	}
	if (property.type === 'fixedCollection' && isPlainObject(value)) {
		const result = sanitizeObject(value);
		for (const option of property.options ?? []) {
			if (!('values' in option) || !Object.hasOwn(result, option.name)) continue;
			const optionValue = result[option.name];
			const entries: NodeParameterValueType[] = Array.isArray(optionValue)
				? optionValue
				: [optionValue];
			const normalized = entries.map((entry) => {
				if (!isPlainObject(entry)) return entry;
				const item = sanitizeObject(entry);
				for (const child of option.values) {
					if (!Object.hasOwn(item, child.name)) continue;
					setSafeObjectProperty(
						item,
						child.name,
						normalizePropertyValue(child, item[child.name], undefined),
					);
				}
				return item;
			});
			setSafeObjectProperty(
				result,
				option.name,
				Array.isArray(result[option.name]) ? normalized : normalized[0],
			);
		}
		return result;
	}
	return value;
}

@Service()
export class NodeToolExecutorService {
	constructor(
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly nodeTypes: NodeTypes,
		private readonly resolver: NodeToolResolverService,
	) {}

	async execute(
		toolset: CompiledNodeToolset,
		tool: CompiledOperationTool,
		argumentsValue: Record<string, unknown>,
	) {
		const sanitizedArguments = sanitizeArguments(argumentsValue);
		const parsed = tool.inputSchema.safeParse(sanitizedArguments);
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
			throw new Error(`Invalid tool input at "${path}": ${issue.message}`);
		}
		const parameters: INodeParameters = {
			...sanitizeArguments(parsed.data),
			...tool.hiddenDefaults,
			...(toolset.endpoint.binding.fixedParameters ?? {}),
		};
		for (const property of tool.properties) {
			if (!Object.hasOwn(parameters, property.name)) continue;
			setSafeObjectProperty(
				parameters,
				property.name,
				normalizePropertyValue(
					property,
					parameters[property.name],
					this.resolver.getResourceMapperSchema(toolset, tool, property.name, parameters),
				),
			);
		}
		if (tool.resource !== undefined) parameters.resource = tool.resource;
		if (tool.operation !== undefined && tool.operation !== 'execute') {
			parameters.operation = tool.operation;
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(
			toolset.endpoint.binding.nodeType,
			toolset.endpoint.binding.nodeVersion,
		);
		applyDefaultsAndValidate(
			tool.properties,
			parameters,
			parameters,
			toolset.endpoint.binding.nodeVersion,
			nodeType.description,
		);
		for (const property of tool.properties) {
			if (!Object.hasOwn(parameters, property.name)) continue;
			setSafeObjectProperty(
				parameters,
				property.name,
				normalizePropertyValue(
					property,
					parameters[property.name],
					this.resolver.getResourceMapperSchema(toolset, tool, property.name, parameters),
				),
			);
		}

		const fixtureResult = executeNodeMcpEvalFixture(toolset, tool, parameters);
		if (fixtureResult) return fixtureResult;

		return await this.ephemeralNodeExecutor.executeInline({
			nodeType: toolset.endpoint.binding.nodeType,
			nodeTypeVersion: toolset.endpoint.binding.nodeVersion,
			nodeParameters: parameters,
			credentialDetails: toolset.endpoint.binding.credentials,
			inputData: [{ json: {} }],
			projectId: toolset.endpoint.binding.projectId,
			nodeName: `${tool.name} POC`,
		});
	}
}
