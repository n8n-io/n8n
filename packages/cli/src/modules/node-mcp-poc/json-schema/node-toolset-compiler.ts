import { Service } from '@n8n/di';
import type {
	DisplayCondition,
	IDisplayOptions,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyMode,
	INodePropertyOptions,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';
import { NodeHelpers, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { NodeTypes } from '@/node-types';

import type { JsonSchemaNodeMcpPocEndpoint } from '../node-mcp-poc.types';
import type {
	CompiledNodeToolset,
	CompiledOperationTool,
	DeferredOptionsDescriptor,
	DynamicParameterDescriptor,
	JsonSchema,
} from './node-mcp-poc.types';
import { isPropertyOption } from './node-mcp-poc.types';

type Coordinates = {
	resource?: string;
	operation?: string;
	version: number;
};

type MappedProperty = {
	zod: z.ZodType;
	json: JsonSchema;
	dynamic: DynamicParameterDescriptor[];
};

const OMITTED_INPUT_TYPES = new Set([
	'button',
	'callout',
	'credentials',
	'credentialsSelect',
	'curlImport',
	'hidden',
	'icon',
	'notice',
]);
const COORDINATE_KEYS = new Set(['resource', 'operation', '@version', '@tool', '@feature']);
const DESTRUCTIVE_OPERATIONS = new Set(['delete', 'remove', 'clear']);

function isJsonSchema(value: unknown): value is JsonSchema {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeGeneratedSchema(schema: JsonSchema): JsonSchema {
	const normalized: JsonSchema = { ...schema };
	if (normalized.properties) {
		normalized.properties = Object.fromEntries(
			Object.entries(normalized.properties).map(([name, property]) => [
				name,
				normalizeGeneratedSchema(property),
			]),
		);
	}
	if (normalized.items) normalized.items = normalizeGeneratedSchema(normalized.items);
	if (normalized.oneOf) normalized.oneOf = normalized.oneOf.map(normalizeGeneratedSchema);
	if (normalized.anyOf) normalized.anyOf = normalized.anyOf.map(normalizeGeneratedSchema);
	const union = normalized.anyOf ?? normalized.oneOf;
	if (
		union?.length &&
		union.every(
			(branch) =>
				branch.const !== undefined &&
				typeof branch.type === 'string' &&
				branch.type === union[0].type,
		)
	) {
		normalized.type = union[0].type;
		normalized.enum = union
			.map((branch) => branch.const)
			.filter(
				(value): value is string | number | boolean =>
					typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
			);
		delete normalized.oneOf;
		delete normalized.anyOf;
	}
	if (
		union?.length &&
		union.every(
			(branch) =>
				typeof branch.type === 'string' && Object.keys(branch).every((key) => key === 'type'),
		)
	) {
		normalized.type = union
			.map((branch) => branch.type)
			.filter((value): value is string => typeof value === 'string');
		delete normalized.oneOf;
		delete normalized.anyOf;
	}
	if (normalized.allOf) normalized.allOf = normalized.allOf.map(normalizeGeneratedSchema);
	if (normalized.if) normalized.if = normalizeGeneratedSchema(normalized.if);
	if (normalized.then) normalized.then = normalizeGeneratedSchema(normalized.then);
	if (normalized.not) normalized.not = normalizeGeneratedSchema(normalized.not);
	if (isJsonSchema(normalized.additionalProperties)) {
		normalized.additionalProperties =
			Object.keys(normalized.additionalProperties).length === 0
				? true
				: normalizeGeneratedSchema(normalized.additionalProperties);
	}
	return normalized;
}

function mergeSchemaMetadata(generated: JsonSchema, metadata: JsonSchema): JsonSchema {
	const merged: JsonSchema = { ...generated, ...metadata };
	if (generated.properties || metadata.properties) {
		const names = new Set([
			...Object.keys(generated.properties ?? {}),
			...Object.keys(metadata.properties ?? {}),
		]);
		merged.properties = Object.fromEntries(
			Array.from(names).map((name) => {
				const generatedProperty = generated.properties?.[name] ?? {};
				const metadataProperty = metadata.properties?.[name] ?? {};
				return [name, mergeSchemaMetadata(generatedProperty, metadataProperty)];
			}),
		);
	}
	if (generated.items && metadata.items) {
		merged.items = mergeSchemaMetadata(generated.items, metadata.items);
	}
	if (generated.oneOf && metadata.oneOf) {
		merged.oneOf = generated.oneOf.map((branch, index) =>
			mergeSchemaMetadata(branch, metadata.oneOf?.[index] ?? {}),
		);
	}
	if (generated.anyOf && metadata.anyOf) {
		merged.anyOf = generated.anyOf.map((branch, index) =>
			mergeSchemaMetadata(branch, metadata.anyOf?.[index] ?? {}),
		);
	}
	if (generated.anyOf && metadata.oneOf) {
		merged.oneOf = generated.anyOf.map((branch, index) =>
			mergeSchemaMetadata(branch, metadata.oneOf?.[index] ?? {}),
		);
		delete merged.anyOf;
	}
	return merged;
}

function jsonSchemaFromZod(schema: z.ZodType, metadata: JsonSchema = {}): JsonSchema {
	const generated = zodToJsonSchema(schema, { $refStrategy: 'none' });
	if (!isJsonSchema(generated)) throw new Error('Could not convert Zod schema to JSON Schema');
	Reflect.deleteProperty(generated, '$schema');
	return mergeSchemaMetadata(normalizeGeneratedSchema(generated), metadata);
}

function withPropertyCountConstraints(
	schema: z.ZodType,
	minProperties: number | undefined,
	maxProperties: number | undefined,
) {
	return schema.superRefine((value: unknown, context) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
		const count = Object.keys(value).length;
		if (minProperties !== undefined && count < minProperties) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Must contain at least ${minProperties} properties`,
			});
		}
		if (maxProperties !== undefined && count > maxProperties) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Must contain at most ${maxProperties} properties`,
			});
		}
	});
}

function shouldOmitProperty(property: INodeProperties) {
	return OMITTED_INPUT_TYPES.has(property.type) || property.typeOptions?.editorIsReadOnly === true;
}

function isEnvFeatureEnabled(property: INodeProperties) {
	return (
		!property.envFeatureFlag ||
		['1', 'true'].includes(
			process.env[`N8N_ENV_FEAT_${property.envFeatureFlag}`]?.toLowerCase() ?? '',
		)
	);
}

function isNodeProperty(value: unknown): value is INodeProperties {
	return typeof value === 'object' && value !== null && 'type' in value && 'name' in value;
}

function isPropertyCollection(value: unknown): value is INodePropertyCollection {
	return typeof value === 'object' && value !== null && 'values' in value && 'name' in value;
}

function withMcpOverrides(property: INodeProperties): INodeProperties {
	const options: INodeProperties['options'] = [];
	for (const option of property.options ?? []) {
		if (isPropertyOption(option)) {
			if (!option.mcp?.hide) options.push(option);
			continue;
		}
		if (isNodeProperty(option)) {
			if (!option.mcp?.hide) options.push(withMcpOverrides(option));
			continue;
		}
		if (isPropertyCollection(option)) {
			options.push({
				...option,
				values: option.values.filter((value) => !value.mcp?.hide).map(withMcpOverrides),
			});
		}
	}
	const hasDefaultOverride =
		property.mcp !== undefined && Object.hasOwn(property.mcp, 'overrideDefault');
	return {
		...property,
		default: hasDefaultOverride ? property.mcp?.overrideDefault : property.default,
		...(property.options ? { options } : {}),
	};
}

function isDisplayCondition(value: unknown): value is DisplayCondition {
	return typeof value === 'object' && value !== null && '_cnd' in value;
}

function isRegexValidation(
	value: unknown,
): value is { type: 'regex'; properties: { regex: string } } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		value.type === 'regex' &&
		'properties' in value &&
		typeof value.properties === 'object' &&
		value.properties !== null &&
		'regex' in value.properties &&
		typeof value.properties.regex === 'string'
	);
}

function resourceLocatorModePattern(mode: INodePropertyMode) {
	const validation = mode.validation?.find(isRegexValidation);
	const pattern = validation
		? validation.properties.regex
		: mode.extractValue?.type === 'regex'
			? mode.extractValue.regex instanceof RegExp
				? mode.extractValue.regex.source
				: mode.extractValue.regex
			: undefined;
	if (!pattern) return undefined;
	try {
		RegExp(pattern);
		return pattern;
	} catch {
		return undefined;
	}
}

function coordinateValues(
	key: string,
	coordinates: Coordinates,
	description: INodeTypeDescription,
): NodeParameterValue[] | undefined {
	if (key === 'resource') return [coordinates.resource];
	if (key === 'operation') return [coordinates.operation];
	if (key === '@version') return [coordinates.version];
	if (key === '@tool') return [description.name.endsWith('Tool')];
	if (key === '@feature') {
		return Object.entries(NodeHelpers.getNodeFeatures(description.features, coordinates.version))
			.filter(([, enabled]) => enabled)
			.map(([name]) => name);
	}
	return undefined;
}

function hasRuntimeDisplayCondition(property: INodeProperties) {
	const keys = [
		...Object.keys(property.displayOptions?.show ?? {}),
		...Object.keys(property.displayOptions?.hide ?? {}),
	];
	return keys.some((key) => !COORDINATE_KEYS.has(key));
}

/**
 * Prunes only conditions known while compiling a resource/operation tool.
 * Conditions on caller-provided selectors stay in the plan and are enforced
 * again after arguments are reconstructed.
 */
function appliesToCoordinates(
	displayOptions: IDisplayOptions | undefined,
	coordinates: Coordinates,
	description: INodeTypeDescription,
) {
	if (!displayOptions) return true;
	for (const [key, expected] of Object.entries(displayOptions.show ?? {})) {
		const actual = coordinateValues(key, coordinates, description);
		if (actual === undefined) continue;
		if (!expected || !NodeHelpers.checkConditions(expected, actual)) return false;
	}
	for (const [key, expected] of Object.entries(displayOptions.hide ?? {})) {
		const actual = coordinateValues(key, coordinates, description);
		if (actual === undefined) continue;
		if (expected && NodeHelpers.checkConditions(expected, actual)) return false;
	}
	return true;
}

function stripHtml(value: string) {
	return value
		.replaceAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '$2 (see: $1)')
		.replaceAll(/<[^>]+>/g, '')
		.replaceAll(/\s+/g, ' ')
		.trim();
}

function propertyDescription(property: INodeProperties, extra?: string) {
	const parts = [
		property.builderHint?.jsonSchemaHint ??
			property.builderHint?.mcpHint ??
			property.builderHint?.propertyHint,
		property.description,
		property.hint,
		property.placeholder ? `Example: ${property.placeholder}` : undefined,
		extra,
	].filter((part): part is string => Boolean(part));
	return stripHtml(parts.join(' '));
}

function staticOptions(property: INodeProperties) {
	return (property.options ?? []).filter(isPropertyOption);
}

function optionDescription(options: INodePropertyOptions[]) {
	if (options.length === 0) return undefined;
	return `One of: ${options
		.map((option) => {
			const label =
				String(option.value) === option.name
					? option.name
					: `${String(option.value)} (${option.name})`;
			return option.description ? `${label} — ${stripHtml(option.description)}` : label;
		})
		.join('; ')}.`;
}

function escapeRegex(value: string) {
	return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function displayConditionSchema(condition: NodeParameterValue | DisplayCondition): JsonSchema {
	if (!isDisplayCondition(condition)) return { const: condition };
	const [operator, operand] = Object.entries(condition._cnd)[0];
	switch (operator) {
		case 'eq':
			return { const: operand };
		case 'not':
			return { not: { const: operand } };
		case 'gte':
			return { minimum: Number(operand) };
		case 'lte':
			return { maximum: Number(operand) };
		case 'gt':
			return { exclusiveMinimum: Number(operand) };
		case 'lt':
			return { exclusiveMaximum: Number(operand) };
		case 'between': {
			const range = operand as { from: number | string; to: number | string };
			return { minimum: Number(range.from), maximum: Number(range.to) };
		}
		case 'startsWith':
			return { type: 'string', pattern: `^${escapeRegex(String(operand))}` };
		case 'endsWith':
			return { type: 'string', pattern: `${escapeRegex(String(operand))}$` };
		case 'includes':
			return { type: 'string', pattern: escapeRegex(String(operand)) };
		case 'regex':
			return { type: 'string', pattern: String(operand) };
		case 'exists':
			return {};
		default:
			return {};
	}
}

function selectorMatchSchema(
	key: string,
	conditions: Array<NodeParameterValue | DisplayCondition>,
): JsonSchema {
	const alternatives = conditions.map(displayConditionSchema);
	return {
		properties: {
			[key]: alternatives.length === 1 ? alternatives[0] : { oneOf: alternatives },
		},
		required: [key],
	};
}

function conditionalRequirement(property: INodeProperties): JsonSchema | undefined {
	if (!property.required || !hasRuntimeDisplayCondition(property)) return undefined;
	const conditions: JsonSchema[] = [];
	for (const [key, values] of Object.entries(property.displayOptions?.show ?? {})) {
		if (!COORDINATE_KEYS.has(key) && values) conditions.push(selectorMatchSchema(key, values));
	}
	for (const [key, values] of Object.entries(property.displayOptions?.hide ?? {})) {
		if (!COORDINATE_KEYS.has(key) && values) {
			conditions.push({ not: selectorMatchSchema(key, values) });
		}
	}
	if (conditions.length === 0) return undefined;
	return {
		if: conditions.length === 1 ? conditions[0] : { allOf: conditions },
		then: { required: [property.name] },
	};
}

function conditionalDescription(property: INodeProperties) {
	if (!property.required || !hasRuntimeDisplayCondition(property)) return undefined;
	const conditions = Object.entries(property.displayOptions?.show ?? {})
		.filter(([key]) => !COORDINATE_KEYS.has(key))
		.map(([key, values]) => `${key} is ${values?.map(String).join(' or ')}`);
	return conditions.length > 0
		? `Required when ${conditions.join(' and ')}.`
		: 'Conditionally required.';
}

function withConditionalRequirements(
	schema: z.ZodObject<z.ZodRawShape>,
	properties: INodeProperties[],
	coordinates: Coordinates,
	description: INodeTypeDescription,
	fixedParameters: INodeParameters,
) {
	return schema.superRefine((values, context) => {
		const parameters: INodeParameters = {
			...values,
			...fixedParameters,
		};
		if (coordinates.resource !== undefined) parameters.resource = coordinates.resource;
		if (coordinates.operation !== undefined) parameters.operation = coordinates.operation;
		for (const property of properties) {
			if (!property.required || !hasRuntimeDisplayCondition(property)) continue;
			const visible = NodeHelpers.displayParameter(
				parameters,
				property,
				{ typeVersion: coordinates.version },
				description,
			);
			if (visible && !Object.hasOwn(values, property.name)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: [property.name],
					message: 'Required',
				});
			}
		}
	});
}

function mergeJsonSchema(existing: JsonSchema | undefined, next: JsonSchema) {
	if (!existing) return next;
	return {
		anyOf:
			existing.anyOf && Object.keys(existing).length === 1
				? [...existing.anyOf, next]
				: [existing, next],
	};
}

function zodForOptionValues(options: INodePropertyOptions[]): z.ZodType {
	const values = options.map((option) => option.value);
	if (values.length === 0) return z.union([z.string(), z.number(), z.boolean()]);
	const literals = values.map((value) => z.literal(value));
	if (literals.length === 1) return literals[0];
	return z.union([literals[0], literals[1], ...literals.slice(2)]);
}

function dynamicDescriptors(property: INodeProperties, path: string): DynamicParameterDescriptor[] {
	const dependencies = property.typeOptions?.loadOptionsDependsOn ?? [];
	if (property.typeOptions?.loadOptionsMethod) {
		return [
			{
				path,
				property,
				kind: 'loadOptions',
				methodName: property.typeOptions.loadOptionsMethod,
				dependencies,
			},
		];
	}
	if (property.typeOptions?.loadOptions) {
		return [{ path, property, kind: 'declarativeOptions', dependencies }];
	}
	if (property.type === 'resourceMapper' && property.typeOptions?.resourceMapper) {
		const mapper = property.typeOptions.resourceMapper;
		return [
			{
				path,
				property,
				kind: 'resourceMapperMethod' in mapper ? 'resourceMapper' : 'localResourceMapper',
				methodName:
					'resourceMapperMethod' in mapper
						? mapper.resourceMapperMethod
						: mapper.localResourceMapperMethod,
				dependencies,
			},
		];
	}
	if (property.type === 'resourceLocator') {
		return (property.modes ?? [])
			.filter(
				(
					mode,
				): mode is INodePropertyMode & {
					typeOptions: { searchListMethod: string };
				} => Boolean(mode.typeOptions?.searchListMethod),
			)
			.map((mode) => ({
				path,
				property,
				kind: 'listSearch',
				methodName: mode.typeOptions.searchListMethod,
				dependencies,
			}));
	}
	return [];
}

function mapNestedProperties(
	properties: INodeProperties[],
	path: string,
	coordinates: Coordinates,
	description: INodeTypeDescription,
): MappedProperty {
	const shape: z.ZodRawShape = {};
	const jsonProperties: Record<string, JsonSchema> = {};
	const conditionalRequirements: JsonSchema[] = [];
	const dynamic: DynamicParameterDescriptor[] = [];
	for (const property of properties) {
		if (
			shouldOmitProperty(property) ||
			!isEnvFeatureEnabled(property) ||
			!appliesToCoordinates(property.displayOptions, coordinates, description)
		) {
			continue;
		}
		const childPath = path ? `${path}.${property.name}` : property.name;
		const mapped = mapProperty(property, childPath, coordinates, description);
		const requiredProperty = property.required && !hasRuntimeDisplayCondition(property);
		const candidateZod = requiredProperty ? mapped.zod : mapped.zod.optional();
		const existingZod = shape[property.name];
		shape[property.name] = existingZod ? z.union([existingZod, candidateZod]) : candidateZod;
		jsonProperties[property.name] = mergeJsonSchema(jsonProperties[property.name], mapped.json);
		const conditional = conditionalRequirement(property);
		if (conditional) conditionalRequirements.push(conditional);
		dynamic.push(...mapped.dynamic);
	}
	const zodSchema = z.object(shape).strict();
	return {
		zod: zodSchema,
		json: jsonSchemaFromZod(zodSchema, {
			properties: jsonProperties,
			...(conditionalRequirements.length > 0 ? { allOf: conditionalRequirements } : {}),
		}),
		dynamic,
	};
}

function mapFixedCollection(
	property: INodeProperties,
	path: string,
	coordinates: Coordinates,
	description: INodeTypeDescription,
): MappedProperty {
	const shape: z.ZodRawShape = {};
	const jsonProperties: Record<string, JsonSchema> = {};
	const dynamic: DynamicParameterDescriptor[] = [];
	for (const option of property.options ?? []) {
		if (!isPropertyCollection(option)) continue;
		const mapped = mapNestedProperties(
			option.values,
			`${path}.${option.name}`,
			coordinates,
			description,
		);
		const constrainedEntry = withPropertyCountConstraints(
			mapped.zod,
			property.typeOptions?.minRequiredFields,
			property.typeOptions?.maxAllowedFields,
		);
		const valueZod = property.typeOptions?.multipleValues
			? z.array(constrainedEntry)
			: constrainedEntry;
		if (property.typeOptions?.minRequiredFields !== undefined) {
			mapped.json.minProperties = property.typeOptions.minRequiredFields;
		}
		if (property.typeOptions?.maxAllowedFields !== undefined) {
			mapped.json.maxProperties = property.typeOptions.maxAllowedFields;
		}
		const valueJson = jsonSchemaFromZod(
			valueZod,
			property.typeOptions?.multipleValues ? { items: mapped.json } : mapped.json,
		);
		shape[option.name] = valueZod.optional();
		jsonProperties[option.name] = valueJson;
		dynamic.push(...mapped.dynamic);
	}
	const zodSchema = z.object(shape).strict();
	return {
		zod: zodSchema,
		json: jsonSchemaFromZod(zodSchema, {
			properties: jsonProperties,
		}),
		dynamic,
	};
}

function mapProperty(
	property: INodeProperties,
	path: string,
	coordinates: Coordinates,
	nodeDescription: INodeTypeDescription,
): MappedProperty {
	let zodSchema: z.ZodType;
	let jsonSchema: JsonSchema;
	let nestedDynamic: DynamicParameterDescriptor[] = [];

	switch (property.type) {
		case 'boolean':
			zodSchema = z.boolean();
			jsonSchema = {};
			break;
		case 'number':
			{
				let numberSchema =
					property.typeOptions?.numberPrecision === 0 ? z.number().int() : z.number();
				if (property.typeOptions?.minValue !== undefined) {
					numberSchema = numberSchema.min(property.typeOptions.minValue);
				}
				if (property.typeOptions?.maxValue !== undefined) {
					numberSchema = numberSchema.max(property.typeOptions.maxValue);
				}
				if (
					property.typeOptions?.numberPrecision !== undefined &&
					property.typeOptions.numberPrecision > 0
				) {
					numberSchema = numberSchema.multipleOf(10 ** -property.typeOptions.numberPrecision);
				}
				zodSchema = numberSchema;
			}
			jsonSchema = {};
			break;
		case 'options': {
			const options = staticOptions(property);
			const dynamic = dynamicDescriptors(property, path).length > 0;
			zodSchema =
				dynamic || property.allowArbitraryValues
					? z.union([z.string(), z.number(), z.boolean()])
					: zodForOptionValues(options);
			jsonSchema =
				options.length > 0 && !property.allowArbitraryValues && !dynamic
					? { 'x-enumNames': options.map((option) => option.name) }
					: {};
			const optionsText = optionDescription(options);
			if (optionsText) jsonSchema.description = optionsText;
			break;
		}
		case 'multiOptions': {
			const options = staticOptions(property);
			const dynamic = dynamicDescriptors(property, path).length > 0;
			zodSchema = z
				.array(
					dynamic || property.allowArbitraryValues
						? z.union([z.string(), z.number(), z.boolean()])
						: zodForOptionValues(options),
				)
				.refine((values) => new Set(values).size === values.length, 'Values must be unique');
			jsonSchema = {
				uniqueItems: true,
			};
			break;
		}
		case 'collection': {
			const children = (property.options ?? []).filter(isNodeProperty);
			const mapped = mapNestedProperties(children, path, coordinates, nodeDescription);
			zodSchema = mapped.zod;
			jsonSchema = mapped.json;
			nestedDynamic = mapped.dynamic;
			break;
		}
		case 'fixedCollection': {
			const mapped = mapFixedCollection(property, path, coordinates, nodeDescription);
			zodSchema = mapped.zod;
			jsonSchema = mapped.json;
			nestedDynamic = mapped.dynamic;
			break;
		}
		case 'resourceLocator':
			{
				const modes = property.modes ?? [];
				const modeSchemas = modes.map((mode) => {
					const pattern = resourceLocatorModePattern(mode);
					const stringValue = pattern ? z.string().regex(new RegExp(pattern)) : z.string();
					const locatorValue = property.noDataExpression
						? z.union([stringValue, z.number()])
						: z.union([stringValue, z.number(), z.string().regex(/^=/)]);
					return z
						.object({
							mode: z.literal(mode.name),
							value: locatorValue,
						})
						.passthrough();
				});
				zodSchema =
					modeSchemas.length === 0
						? z
								.object({
									mode: z.string(),
									value: property.noDataExpression
										? z.union([z.string(), z.number()])
										: z.union([z.string(), z.number(), z.string().regex(/^=/)]),
								})
								.passthrough()
						: modeSchemas.length === 1
							? modeSchemas[0]
							: z.union([modeSchemas[0], modeSchemas[1], ...modeSchemas.slice(2)]);
			}
			jsonSchema = {
				'x-resource-locator': true,
				oneOf: (property.modes ?? []).map((mode) => {
					const pattern = resourceLocatorModePattern(mode);
					return {
						title: mode.displayName,
						properties: {
							value: {
								pattern,
								description: propertyDescription({
									...property,
									description: mode.hint,
									hint: undefined,
									builderHint: undefined,
									placeholder: mode.placeholder,
								}),
							},
						},
					};
				}),
			};
			break;
		case 'dateTime':
			zodSchema = z.string();
			jsonSchema = { format: property.typeOptions?.dateOnly ? 'date' : 'date-time' };
			break;
		case 'color':
			zodSchema = z
				.string()
				.regex(
					property.typeOptions?.showAlpha
						? /^#?[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/
						: /^#?[0-9A-Fa-f]{6}$/,
				);
			jsonSchema = {};
			break;
		case 'string':
			zodSchema = z.string();
			jsonSchema = {
				...(property.typeOptions?.password ? { writeOnly: true, 'x-sensitive': true } : {}),
				...(property.typeOptions?.editor
					? {
							contentMediaType:
								property.typeOptions.editor === 'sqlEditor'
									? 'application/sql'
									: property.typeOptions.editor === 'htmlEditor'
										? 'text/html'
										: property.typeOptions.editor === 'cssEditor'
											? 'text/css'
											: 'application/javascript',
						}
					: {}),
			};
			break;
		case 'json':
			zodSchema = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.string()]);
			jsonSchema = {
				contentMediaType: 'application/json',
			};
			break;
		case 'filter': {
			const filter = property.typeOptions?.filter;
			const combinators = filter?.allowedCombinators ?? ['and', 'or'];
			const combinatorSchema =
				combinators.length === 1
					? z.literal(combinators[0])
					: z.union([
							z.literal(combinators[0]),
							z.literal(combinators[1]),
							...combinators.slice(2).map((value) => z.literal(value)),
						]);
			const conditionShape: z.ZodRawShape = {
				operator: z.string(),
				rightValue: z.unknown().optional(),
			};
			if (!filter?.leftValue) conditionShape.leftValue = z.string();
			zodSchema = z
				.object({
					combinator: combinatorSchema.optional(),
					conditions: z
						.array(z.object(conditionShape).passthrough())
						.max(filter?.maxConditions ?? 10)
						.optional(),
				})
				.passthrough();
			jsonSchema = {};
			break;
		}
		case 'resourceMapper': {
			const mapper = property.typeOptions?.resourceMapper;
			const modes = mapper?.supportAutoMap ? ['defineBelow', 'autoMapInputData'] : ['defineBelow'];
			const shape: z.ZodRawShape = {
				mappingMode:
					modes.length === 1
						? z.literal(modes[0])
						: z.union([
								z.literal(modes[0]),
								z.literal(modes[1]),
								...modes.slice(2).map((value) => z.literal(value)),
							]),
				value: z.record(z.string(), z.unknown()).optional(),
			};
			if (mapper?.mode === 'update' || mapper?.mode === 'upsert') {
				shape.matchingColumns = z
					.array(z.string())
					.refine((values) => new Set(values).size === values.length, 'Values must be unique')
					.optional();
			}
			zodSchema = z.object(shape).strict();
			jsonSchema = {
				'x-resource-mapper': { mode: mapper?.mode ?? 'map' },
				...(mapper?.mode === 'update' || mapper?.mode === 'upsert'
					? { properties: { matchingColumns: { uniqueItems: true } } }
					: {}),
			};
			break;
		}
		case 'assignmentCollection': {
			const assignment = property.typeOptions?.assignment;
			const defaultType = assignment?.defaultType ?? 'string';
			const typeSchema =
				assignment?.hideType || assignment?.disableType
					? z.literal(defaultType).optional()
					: z.enum(['string', 'number', 'boolean', 'array', 'object']).optional();
			zodSchema = z.array(
				z
					.object({
						name: z.string(),
						type: typeSchema,
						value: z.unknown().refine((value) => value !== undefined, 'Required'),
					})
					.strict(),
			);
			jsonSchema = {
				items: {
					properties: {
						type:
							assignment?.hideType || assignment?.disableType
								? {}
								: {
										default: defaultType,
									},
					},
				},
			};
			break;
		}
		case 'workflowSelector':
		case 'agentSelector':
			zodSchema = z.string();
			jsonSchema = { 'x-selector': property.type };
			break;
		default:
			zodSchema = z.never();
			jsonSchema = {};
	}

	switch (property.validateType) {
		case 'boolean':
			zodSchema = z.boolean();
			break;
		case 'number':
			zodSchema = z.number();
			break;
		case 'array':
			zodSchema = z.array(z.unknown());
			break;
		case 'object':
			zodSchema = z.record(z.string(), z.unknown());
			break;
		case 'string-alphanumeric':
			zodSchema = z.string().regex(/^[a-zA-Z0-9]+$/);
			break;
		case 'dateTime':
			zodSchema = z.string().datetime();
			break;
		case 'time':
			zodSchema = z.string().time();
			break;
		case 'url':
			zodSchema = z.string().url();
			break;
	}

	if (
		property.typeOptions?.multipleValues &&
		property.type !== 'fixedCollection' &&
		property.type !== 'multiOptions'
	) {
		zodSchema = z.array(zodSchema);
		jsonSchema = { items: jsonSchema };
	}
	if (property.typeOptions?.sortable) jsonSchema['x-ordered'] = true;
	const fullDescription = propertyDescription(
		property,
		[
			jsonSchema.description,
			property.requiresDataPath
				? `Provide a ${property.requiresDataPath} item data path.`
				: undefined,
			property.typeOptions?.sqlDialect
				? `SQL dialect: ${property.typeOptions.sqlDialect}.`
				: undefined,
			conditionalDescription(property),
		]
			.filter((part): part is string => Boolean(part))
			.join(' '),
	);
	if (fullDescription) {
		zodSchema = zodSchema.describe(fullDescription);
	}
	if (
		property.default !== undefined &&
		typeof property.default !== 'object' &&
		!property.typeOptions?.password
	) {
		jsonSchema.default = property.default;
	}
	const compiledJsonSchema = jsonSchemaFromZod(zodSchema, jsonSchema);
	if (!property.noDataExpression && property.type !== 'json') {
		zodSchema = z.union([
			zodSchema,
			z.string().regex(/^=/, 'Expected an n8n expression starting with "="'),
		]);
		if (fullDescription) zodSchema = zodSchema.describe(fullDescription);
	}
	return {
		zod: zodSchema,
		json: compiledJsonSchema,
		dynamic: [...dynamicDescriptors(property, path), ...nestedDynamic],
	};
}

function optionValues(
	property: INodeProperties | undefined,
	coordinates?: Coordinates,
	description?: INodeTypeDescription,
) {
	return property
		? staticOptions(property)
				.filter(
					(option) =>
						!coordinates ||
						!description ||
						appliesToCoordinates(option.displayOptions, coordinates, description),
				)
				.map((option) => String(option.value))
		: [];
}

function deferredOptionsProperty(property: INodeProperties) {
	return (
		(property.displayName === 'Options' && property.name === 'options') ||
		(property.displayName === 'Additional Fields' && property.name === 'additionalFields')
	);
}

function jsonSchemaAtPath(properties: Record<string, JsonSchema>, path: string) {
	const segments = path.split('.');
	let schema: JsonSchema | undefined = properties[segments.shift() ?? ''];
	for (const segment of segments) {
		if (!schema) return undefined;
		const objectSchema: JsonSchema | undefined = schema.type === 'array' ? schema.items : schema;
		schema = objectSchema?.properties?.[segment];
	}
	return schema;
}

function sortDynamicParameters(descriptors: DynamicParameterDescriptor[]) {
	const remaining = [...descriptors];
	const result: DynamicParameterDescriptor[] = [];
	while (remaining.length > 0) {
		const readyIndex = remaining.findIndex((descriptor) =>
			descriptor.dependencies.every(
				(dependency) =>
					!remaining.some(
						(candidate) =>
							candidate !== descriptor &&
							candidate.path !== descriptor.path &&
							(dependency === candidate.path || dependency.startsWith(`${candidate.path}.`)),
					),
			),
		);
		if (readyIndex === -1) {
			throw new Error(
				`Dynamic parameter dependency cycle: ${remaining.map(({ path }) => path).join(', ')}`,
			);
		}
		result.push(...remaining.splice(readyIndex, 1));
	}
	return result;
}

function includeTransitiveDependencies(descriptors: DynamicParameterDescriptor[]) {
	return descriptors.map((descriptor, index) => {
		const dependencies = new Set<string>();
		for (const dependency of descriptor.dependencies) {
			const ancestor = descriptors
				.slice(0, index)
				.find(
					(candidate) =>
						dependency === candidate.path || dependency.startsWith(`${candidate.path}.`),
				);
			for (const ancestorDependency of ancestor?.dependencies ?? []) {
				dependencies.add(ancestorDependency);
			}
			dependencies.add(dependency);
		}
		return { ...descriptor, dependencies: [...dependencies] };
	});
}

function operationDescription(
	node: INodeTypeDescription,
	resource: string | undefined,
	operation: string | undefined,
	version: number,
	deferredOptions: DeferredOptionsDescriptor[],
) {
	const coordinates = { resource, operation, version };
	const option = node.properties
		.filter(
			(property) =>
				property.name === 'operation' &&
				appliesToCoordinates(property.displayOptions, coordinates, node),
		)
		.flatMap(staticOptions)
		.find(
			(candidate) =>
				String(candidate.value) === operation &&
				appliesToCoordinates(candidate.displayOptions, coordinates, node),
		);
	const action =
		option?.action ?? option?.name ?? `${operation ?? 'Execute'} ${resource ?? node.displayName}`;
	const parts = [
		action,
		option?.description,
		`Node: ${node.displayName} (v${version}).`,
		deferredOptions.length > 0
			? 'Optional fields are hidden from this schema; call list_options before supplying them.'
			: undefined,
	];
	return stripHtml(parts.filter((part): part is string => Boolean(part)).join(' — '));
}

@Service()
export class NodeToolsetCompiler {
	constructor(private readonly nodeTypes: NodeTypes) {}

	compile(endpoint: JsonSchemaNodeMcpPocEndpoint): CompiledNodeToolset {
		const nodeType = this.nodeTypes.getByNameAndVersion(
			endpoint.binding.nodeType,
			endpoint.binding.nodeVersion,
		);
		if (nodeType.poll || nodeType.trigger || nodeType.description.group.includes('trigger')) {
			throw new Error(
				`Trigger node "${endpoint.binding.nodeType}" cannot be exposed as an MCP toolset`,
			);
		}
		const description: INodeTypeDescription = {
			...nodeType.description,
			properties: nodeType.description.properties
				.filter((property) => !property.mcp?.hide)
				.map(withMcpOverrides),
		};
		const resourceProperty = description.properties.find(
			(property) => property.name === 'resource' && property.type === 'options',
		);
		const resources: Array<string | undefined> = resourceProperty
			? optionValues(resourceProperty, { version: endpoint.binding.nodeVersion }, description)
			: [undefined];
		const tools: CompiledOperationTool[] = [];

		for (const resource of resources) {
			const operationProperties = description.properties.filter(
				(property) =>
					property.name === 'operation' &&
					property.type === 'options' &&
					appliesToCoordinates(
						property.displayOptions,
						{
							resource,
							version: endpoint.binding.nodeVersion,
						},
						description,
					),
			);
			const discoveredOperations =
				operationProperties.length > 0
					? operationProperties.flatMap((property) =>
							optionValues(
								property,
								{ resource, version: endpoint.binding.nodeVersion },
								description,
							),
						)
					: ['execute'];
			const operations = [...new Set(discoveredOperations)];
			for (const operation of operations) {
				if (operation === SEND_AND_WAIT_OPERATION) continue;
				const tool = this.compileOperation(description, endpoint, resource, operation);
				if (
					(endpoint.flavor.allowTools && !endpoint.flavor.allowTools.includes(tool.name)) ||
					endpoint.flavor.denyTools?.includes(tool.name) ||
					(tool.destructive && !endpoint.flavor.allowDestructive)
				) {
					continue;
				}
				if (tools.some(({ name }) => name === tool.name)) {
					throw new Error(`Duplicate MCP tool name "${tool.name}"`);
				}
				tools.push(tool);
			}
		}

		return { endpoint, tools };
	}

	private compileOperation(
		description: INodeTypeDescription,
		endpoint: JsonSchemaNodeMcpPocEndpoint,
		resource: string | undefined,
		operation: string,
	): CompiledOperationTool {
		const coordinates = {
			resource,
			operation,
			version: endpoint.binding.nodeVersion,
		};
		const properties = description.properties.filter(
			(property) =>
				!['resource', 'operation'].includes(property.name) &&
				!shouldOmitProperty(property) &&
				isEnvFeatureEnabled(property) &&
				appliesToCoordinates(property.displayOptions, coordinates, description),
		);
		const inputShape: z.ZodRawShape = {};
		const jsonProperties: Record<string, JsonSchema> = {};
		const dynamicParameters: DynamicParameterDescriptor[] = [];
		const deferredOptions: DeferredOptionsDescriptor[] = [];
		const conditionalRequirements: JsonSchema[] = [];
		const hiddenDefaults: INodeParameters = {};

		for (const property of description.properties) {
			if (
				property.type === 'hidden' &&
				property.default !== undefined &&
				isEnvFeatureEnabled(property) &&
				appliesToCoordinates(property.displayOptions, coordinates, description)
			) {
				hiddenDefaults[property.name] = property.default;
			}
		}

		for (const property of properties) {
			if (endpoint.flavor.hideOptions && deferredOptionsProperty(property)) {
				const children = (property.options ?? []).filter(isNodeProperty);
				const mapped = mapNestedProperties(children, property.name, coordinates, description);
				const descriptionText = `${property.displayName}. Call list_options with tool and path "${property.name}" to retrieve available fields.`;
				const deferredSchema = z
					.record(z.string(), z.unknown())
					.optional()
					.describe(descriptionText);
				inputShape[property.name] = deferredSchema;
				jsonProperties[property.name] = jsonSchemaFromZod(deferredSchema);
				deferredOptions.push({
					path: property.name,
					displayName: property.displayName,
					jsonSchema: mapped.json,
					options: children,
				});
				dynamicParameters.push(...mapped.dynamic);
				continue;
			}

			const mapped = mapProperty(property, property.name, coordinates, description);
			const requiredProperty = property.required && !hasRuntimeDisplayCondition(property);
			const candidateZod = requiredProperty ? mapped.zod : mapped.zod.optional();
			const existingZod = inputShape[property.name];
			inputShape[property.name] = existingZod ? z.union([existingZod, candidateZod]) : candidateZod;
			jsonProperties[property.name] = mergeJsonSchema(jsonProperties[property.name], mapped.json);
			const conditional = conditionalRequirement(property);
			if (conditional) conditionalRequirements.push(conditional);
			dynamicParameters.push(...mapped.dynamic);
		}

		const name = `${resource ?? 'default'}_${operation}`.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
		const orderedDynamicParameters = includeTransitiveDependencies(
			sortDynamicParameters(dynamicParameters),
		);
		const resolverNames: string[] = [];
		for (const descriptor of orderedDynamicParameters) {
			const propertySchema = jsonSchemaAtPath(jsonProperties, descriptor.path);
			if (!propertySchema) continue;
			const resolverName = `${name}__resolve_${descriptor.path.replaceAll(/[^a-zA-Z0-9_-]/g, '_')}`;
			resolverNames.push(resolverName);
			const rootName = descriptor.path.split('.')[0];
			const rootInput = inputShape[rootName];
			if (rootInput) {
				inputShape[rootName] = rootInput.describe(
					`${rootInput.description ?? ''} Dynamic values: call ${resolverName}.${descriptor.dependencies.length > 0 ? ` Requires ${descriptor.dependencies.join(', ')}.` : ''}`.trim(),
				);
			}
			propertySchema['x-dynamic'] = {
				resolver: resolverName,
				dependsOn: descriptor.dependencies,
			};
			if (propertySchema['x-resource-mapper']) {
				propertySchema['x-resource-mapper'].resolver = resolverName;
			}
		}
		const destructive = DESTRUCTIVE_OPERATIONS.has(operation.toLowerCase());
		const inputSchema = withConditionalRequirements(
			z.object(inputShape).strict(),
			properties,
			coordinates,
			description,
			endpoint.binding.fixedParameters ?? {},
		);
		const baseDescription = operationDescription(
			description,
			resource,
			operation,
			endpoint.binding.nodeVersion,
			deferredOptions,
		);
		return {
			name,
			description:
				resolverNames.length > 0
					? `${baseDescription} Resolve dynamic parameters in order: ${resolverNames.join(' → ')}.`
					: baseDescription,
			destructive,
			resource,
			operation,
			inputSchema,
			inputFields: inputShape,
			jsonSchema: jsonSchemaFromZod(inputSchema, {
				properties: jsonProperties,
				...(conditionalRequirements.length > 0 ? { allOf: conditionalRequirements } : {}),
				...(destructive ? { 'x-destructive': true } : {}),
			}),
			properties,
			hiddenDefaults,
			dynamicParameters: orderedDynamicParameters,
			deferredOptions,
		};
	}
}
