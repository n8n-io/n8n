import { Service } from '@n8n/di';
import type {
	DisplayCondition,
	IDisplayOptions,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyMode,
	INodePropertyOptions,
	INodeTypeDescription,
	NodeParameterValue,
	ResourceMapperField,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import type {
	ActionLookupNodeMcpPocEndpoint,
	JsonSchemaNodeMcpPocEndpoint,
	NodeMcpPocBinding,
} from '../node-mcp-poc.types';
import { isPropertyOption } from '../json-schema/node-mcp-poc.types';
import { NodeToolsetCompiler } from '../json-schema/node-toolset-compiler';
import type {
	CompiledActionPlan,
	NodeActionCondition,
	NodeActionConditionOperator,
	NodeActionField,
	VisibleActionCatalog,
} from './action-lookup.types';

const COORDINATE_KEYS = new Set(['resource', 'operation', '@version', '@tool', '@feature']);
const EXCLUDED_FIELD_NAMES = new Set(['autoMapInputData']);

function stripHtml(value: string) {
	return value
		.replaceAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '$2 (see: $1)')
		.replaceAll(/<[^>]+>/g, '')
		.replaceAll(/\s+/g, ' ')
		.trim();
}

function isNodeProperty(value: unknown): value is INodeProperties {
	return typeof value === 'object' && value !== null && 'type' in value && 'name' in value;
}

function isPropertyCollection(value: unknown): value is INodePropertyCollection {
	return typeof value === 'object' && value !== null && 'values' in value && 'name' in value;
}

function isIncludedField(property: INodeProperties) {
	return !EXCLUDED_FIELD_NAMES.has(property.name);
}

function isDisplayCondition(value: unknown): value is DisplayCondition {
	return typeof value === 'object' && value !== null && '_cnd' in value;
}

function displayCondition(
	field: string,
	value: NodeParameterValue | DisplayCondition,
	negated: boolean,
): NodeActionCondition | undefined {
	if (!isDisplayCondition(value)) {
		return {
			field,
			operator: negated ? 'notEquals' : 'equals',
			value,
		};
	}
	const entry = Object.entries(value._cnd)[0];
	if (!entry) return undefined;
	const [operator, operand] = entry;
	const operators: Partial<Record<string, NodeActionConditionOperator>> = {
		eq: 'equals',
		not: 'notEquals',
		gte: 'greaterThan',
		lte: 'lessThan',
		gt: 'greaterThan',
		lt: 'lessThan',
		between: 'between',
		startsWith: 'startsWith',
		endsWith: 'endsWith',
		includes: 'contains',
		regex: 'matches',
		exists: 'exists',
	};
	const mapped = operators[operator];
	if (!mapped) return undefined;
	if (!negated) return { field, operator: mapped, value: operand };
	if (mapped === 'equals') return { field, operator: 'notEquals', value: operand };
	if (mapped === 'notEquals') return { field, operator: 'equals', value: operand };
	return undefined;
}

function when(displayOptions: IDisplayOptions | undefined) {
	if (!displayOptions) return undefined;
	const conditions: NodeActionCondition[] = [];
	for (const [field, values] of Object.entries(displayOptions.show ?? {})) {
		if (COORDINATE_KEYS.has(field) || !values) continue;
		if (values.length > 1 && values.every((value) => !isDisplayCondition(value))) {
			conditions.push({ field, operator: 'in', value: values });
			continue;
		}
		for (const value of values) {
			const condition = displayCondition(field, value, false);
			if (condition) conditions.push(condition);
		}
	}
	for (const [field, values] of Object.entries(displayOptions.hide ?? {})) {
		if (COORDINATE_KEYS.has(field) || !values) continue;
		for (const value of values) {
			const condition = displayCondition(field, value, true);
			if (condition) conditions.push(condition);
		}
	}
	return conditions.length > 0 ? { all: conditions } : undefined;
}

function descriptionFor(property: INodeProperties) {
	const description = [
		property.builderHint?.propertyHint,
		property.description,
		property.hint,
		property.placeholder ? `Example: ${property.placeholder}` : undefined,
	]
		.filter((value): value is string => Boolean(value))
		.join(' ');
	return description ? stripHtml(description) : undefined;
}

function choices(options: INodePropertyOptions[]) {
	return options.map((option) => ({
		value: option.value,
		label: option.name,
		...(option.description ? { description: stripHtml(option.description) } : {}),
	}));
}

function accepts(modes: readonly INodePropertyMode[]) {
	const values = modes.flatMap((mode) => {
		const name = mode.name.toLowerCase();
		const type = mode.type.toLowerCase();
		if (name.includes('url') || type.includes('url')) return ['url'];
		if (name.includes('id')) return ['id'];
		if (name.includes('name')) return ['name'];
		if (type === 'list') return ['id'];
		return [];
	});
	return [...new Set(values.length > 0 ? values : ['id'])];
}

function propertyType(property: INodeProperties): NodeActionField['type'] {
	switch (property.type) {
		case 'boolean':
			return 'boolean';
		case 'number':
			return 'number';
		case 'options':
			return 'choice';
		case 'multiOptions':
		case 'assignmentCollection':
			return 'array';
		case 'collection':
		case 'fixedCollection':
		case 'filter':
		case 'resourceMapper':
			return 'object';
		case 'resourceLocator':
		case 'workflowSelector':
		case 'agentSelector':
			return 'resource';
		case 'json':
			return 'json';
		default:
			return 'string';
	}
}

function fieldForProperty(
	property: INodeProperties,
	path: string,
	dynamicDependencies: ReadonlyMap<string, string[]>,
): NodeActionField {
	const type = propertyType(property);
	const field: NodeActionField = {
		name: property.name,
		label: property.displayName,
		type,
		required: property.required === true,
	};
	const description = descriptionFor(property);
	if (description) field.description = description;
	const condition = when(property.displayOptions);
	if (condition) field.when = condition;
	const dependencies = dynamicDependencies.get(path);
	if (dependencies) field.resolve = { dependsOn: dependencies };

	if (property.type === 'options' || property.type === 'multiOptions') {
		const staticOptions = (property.options ?? []).filter(isPropertyOption);
		if (staticOptions.length > 0) field.choices = choices(staticOptions);
	}
	if (property.type === 'resourceLocator') field.accepts = accepts(property.modes ?? []);
	if (property.type === 'collection') {
		field.fields = (property.options ?? [])
			.filter(isNodeProperty)
			.filter(isIncludedField)
			.map((child) => fieldForProperty(child, `${path}.${child.name}`, dynamicDependencies));
	}
	if (property.type === 'fixedCollection') {
		field.fields = (property.options ?? []).filter(isPropertyCollection).map((option) => ({
			name: option.name,
			label: option.displayName,
			type: property.typeOptions?.multipleValues ? 'array' : 'object',
			required: false,
			...(property.typeOptions?.multipleValues
				? {
						items: {
							name: 'item',
							label: option.displayName,
							type: 'object',
							required: true,
							fields: option.values
								.filter(isIncludedField)
								.map((child) =>
									fieldForProperty(
										child,
										`${path}.${option.name}.${child.name}`,
										dynamicDependencies,
									),
								),
						},
					}
				: {
						fields: option.values
							.filter(isIncludedField)
							.map((child) =>
								fieldForProperty(
									child,
									`${path}.${option.name}.${child.name}`,
									dynamicDependencies,
								),
							),
					}),
		}));
	}
	if (property.typeOptions?.multipleValues && property.type !== 'fixedCollection') {
		return {
			...field,
			type: 'array',
			items: { ...field, name: 'item', required: true },
			choices: undefined,
			accepts: undefined,
			fields: undefined,
		};
	}
	return field;
}

function publicDependency(path: string, resourcePaths: ReadonlySet<string>) {
	for (const resourcePath of resourcePaths) {
		if (path === `${resourcePath}.value` || path === `${resourcePath}.mode`) return resourcePath;
	}
	return path;
}

function actionMetadata(description: INodeTypeDescription, operation: string) {
	const options = description.properties
		.filter((property) => property.name === 'operation' && property.type === 'options')
		.flatMap((property) => property.options ?? [])
		.filter(isPropertyOption);
	const option = options.find((candidate) => String(candidate.value) === operation);
	const name = option?.name ?? operation;
	const detail = [option?.action, option?.description, `Node: ${description.displayName}.`]
		.filter((value): value is string => Boolean(value))
		.join(' ');
	return { name, description: stripHtml(detail) };
}

function syntheticEndpoint(
	endpoint: ActionLookupNodeMcpPocEndpoint,
	binding: NodeMcpPocBinding,
): JsonSchemaNodeMcpPocEndpoint {
	return {
		endpoint: `${endpoint.endpoint}:${binding.nodeType}@${binding.nodeVersion}`,
		type: 'json-schema',
		binding,
		flavor: {
			resolver: 'generic-single',
			hideOptions: false,
			allowDestructive: true,
		},
	};
}

export function fieldFromResourceMapper(field: ResourceMapperField): NodeActionField {
	const staticOptions = (field.options ?? []).filter(isPropertyOption);
	const type: NodeActionField['type'] =
		field.type === 'options'
			? 'choice'
			: field.type === 'boolean'
				? 'boolean'
				: field.type === 'number'
					? 'number'
					: field.type === 'array'
						? 'array'
						: field.type === 'object'
							? 'object'
							: 'string';
	return {
		name: field.id,
		label: field.displayName,
		type,
		required: field.required,
		...(staticOptions.length > 0 ? { choices: choices(staticOptions) } : {}),
	};
}

@Service()
export class NodeActionCompiler {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly toolsetCompiler: NodeToolsetCompiler,
	) {}

	compile(endpoint: ActionLookupNodeMcpPocEndpoint): VisibleActionCatalog {
		const actions: CompiledActionPlan[] = [];
		for (const binding of endpoint.bindings) {
			const nodeType = this.nodeTypes.getByNameAndVersion(binding.nodeType, binding.nodeVersion);
			const toolset = this.toolsetCompiler.compile(syntheticEndpoint(endpoint, binding));
			for (const tool of toolset.tools) {
				const id = `${binding.nodeType}@${binding.nodeVersion}/${tool.resource ?? 'default'}.${tool.operation ?? 'execute'}`;
				const allowed =
					!endpoint.policy?.allowActions ||
					endpoint.policy.allowActions.includes(id) ||
					endpoint.policy.allowActions.includes(tool.name);
				const denied =
					endpoint.policy?.denyActions?.includes(id) === true ||
					endpoint.policy?.denyActions?.includes(tool.name) === true;
				if (!allowed || denied || (tool.destructive && !endpoint.policy?.allowDestructive))
					continue;

				const resourcePaths = new Set(
					tool.dynamicParameters
						.filter((descriptor) => descriptor.property.type === 'resourceLocator')
						.map((descriptor) => descriptor.path),
				);
				const dynamicDependencies = new Map(
					tool.dynamicParameters.map((descriptor) => [
						descriptor.path,
						[
							...new Set(
								descriptor.dependencies.map((dependency) =>
									publicDependency(dependency, resourcePaths),
								),
							),
						],
					]),
				);
				const resourceModesByPath = new Map<string, readonly INodePropertyMode[]>();
				for (const descriptor of tool.dynamicParameters) {
					if (descriptor.property.type === 'resourceLocator') {
						resourceModesByPath.set(descriptor.path, descriptor.property.modes ?? []);
					}
				}
				const seen = new Set<string>();
				const fields = tool.properties
					.filter((property) => {
						if (!isIncludedField(property) || seen.has(property.name)) return false;
						seen.add(property.name);
						return true;
					})
					.map((property) => fieldForProperty(property, property.name, dynamicDependencies));
				const action = actionMetadata(nodeType.description, tool.operation ?? 'execute');
				const summary = {
					id,
					node: {
						type: binding.nodeType,
						version: binding.nodeVersion,
						name: nodeType.description.displayName,
					},
					name: action.name,
					description: action.description,
					destructive: tool.destructive,
					requiresCredential: Object.keys(binding.credentials).length > 0,
					hasDynamicParameters: tool.dynamicParameters.length > 0,
				};
				actions.push({
					id,
					summary,
					definition: {
						id,
						node: summary.node,
						action: {
							...(tool.resource ? { resource: tool.resource } : {}),
							operation: tool.operation ?? 'execute',
							name: action.name,
							description: action.description,
							destructive: tool.destructive,
						},
						input: { fields },
					},
					toolset,
					tool,
					dynamicParameters: tool.dynamicParameters,
					resourceModesByPath,
				});
			}
		}
		actions.sort((left, right) => left.id.localeCompare(right.id));
		return { endpoint: endpoint.endpoint, actions };
	}
}
