import { z } from 'zod';

import { parse } from '../parse';
import type {
	ApiParameter,
	HttpMethod,
	Schema,
	Spec,
	SpecGroup,
	SpecOperation,
	SpecOptions,
	SpecTag,
} from '../types';

const JSON_MEDIA_TYPE = 'application/json';

const METHODS: Record<string, HttpMethod> = {
	delete: 'DELETE',
	get: 'GET',
	patch: 'PATCH',
	post: 'POST',
	put: 'PUT',
};

const schemaSchema: z.ZodType<Schema> = z.lazy(() =>
	z
		.object({
			type: z.string().optional(),
			format: z.string().optional(),
			enum: z.array(z.unknown()).optional(),
			default: z.unknown().optional(),
			description: z.string().optional(),
			readOnly: z.boolean().optional(),
			deprecated: z.boolean().optional(),
			items: schemaSchema.optional(),
			properties: z.record(schemaSchema).optional(),
			required: z.array(z.string()).optional(),
		})
		.passthrough(),
);

const parameterSchema = z.object({
	name: z.string().min(1),
	in: z.enum(['path', 'query', 'header']),
	required: z.boolean().optional(),
	deprecated: z.boolean().optional(),
	description: z.string().optional(),
	schema: schemaSchema,
});

const operationSchema = z.object({
	operationId: z.string().min(1),
	summary: z.string().optional(),
	tags: z.array(z.string()).length(1),
	deprecated: z.boolean().optional(),
	parameters: z.array(parameterSchema).optional(),
	requestBody: z
		.object({
			required: z.boolean().optional(),
			content: z.record(z.object({ schema: schemaSchema.optional() })),
		})
		.optional(),
	responses: z.record(z.object({ content: z.record(z.unknown()).optional() })),
});

type Operation = z.infer<typeof operationSchema>;

const routesSchema = z.object({ paths: z.record(z.record(z.unknown())) });

const envelopeSchema = z.object({
	tags: z.array(
		z.object({
			name: z.string().min(1),
			'x-displayName': z.string().min(1),
			'x-parent': z.string().optional(),
		}),
	),
});

function readTags(envelope: unknown): SpecTag[] {
	const { tags } = parse(envelopeSchema, envelope, 'the tags of the spec');

	const groups = new Map<string, SpecGroup>();
	for (const tag of tags) {
		if (tag['x-parent'] === undefined) {
			groups.set(tag.name, { name: tag.name, displayName: tag['x-displayName'] });
		}
	}

	const childTags: SpecTag[] = [];
	for (const tag of tags) {
		const parent = tag['x-parent'];
		if (parent === undefined) continue;
		const group = groups.get(parent);
		if (!group) {
			throw new Error(
				`Cannot read the tags of the spec: the tag "${tag.name}" has the parent "${parent}", but no parent tag has this name.`,
			);
		}
		childTags.push({ name: tag.name, displayName: tag['x-displayName'], group });
	}
	return childTags;
}

function readBodyParameters(operation: Operation, blockers: string[]): ApiParameter[] {
	const { requestBody } = operation;
	if (!requestBody) return [];

	const body = requestBody.content[JSON_MEDIA_TYPE]?.schema;
	if (!body) {
		blockers.push(`${Object.keys(requestBody.content).join(', ')} request body`);
		return [];
	}

	if (body.properties) {
		const required = body.required ?? [];
		return Object.entries(body.properties)
			.filter(([, schema]) => schema.readOnly !== true)
			.map(([name, schema]) => ({
				name,
				location: 'body',
				required: required.includes(name),
				deprecated: schema.deprecated === true,
				schema,
				description: schema.description,
			}));
	}

	return [
		{
			name: 'body',
			location: 'wholeBody',
			required: requestBody.required === true,
			deprecated: body.deprecated === true,
			schema: body,
			description: body.description,
		},
	];
}

function readParameters(operation: Operation, options: SpecOptions) {
	const blockers = operation.summary ? [] : ['no summary'];
	const parameters: ApiParameter[] = [];
	const specParameters = operation.parameters ?? [];
	const paginated = specParameters.some((parameter) => parameter.name === options.cursorParameter);

	for (const parameter of specParameters) {
		const { name } = parameter;
		if (parameter.in === 'header') {
			if (!options.ignoredHeaderParameters.includes(name)) {
				blockers.push(`header parameter "${name}"`);
			}
			continue;
		}
		if (paginated && (name === options.cursorParameter || name === options.limitParameter)) {
			continue;
		}
		const { schema } = parameter;
		parameters.push({
			name,
			location: parameter.in,
			required: parameter.required === true,
			deprecated: parameter.deprecated === true || schema.deprecated === true,
			schema,
			description: parameter.description ?? schema.description,
		});
	}

	parameters.push(...readBodyParameters(operation, blockers));

	const responseTypes = Object.entries(operation.responses)
		.filter(([status]) => status.startsWith('2'))
		.flatMap(([, response]) => Object.keys(response.content ?? {}));
	if (responseTypes.length > 0 && !responseTypes.includes(JSON_MEDIA_TYPE)) {
		blockers.push(`${responseTypes[0]} response`);
	}

	return { parameters, paginated, blockers };
}

export interface SpecDocuments {
	routes: unknown;
	envelope: unknown;
}

export function readSpec(documents: SpecDocuments, options: SpecOptions): Spec {
	const tags = readTags(documents.envelope);
	const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));
	const routes = parse(routesSchema, documents.routes, 'the paths of the spec');

	const operations = new Map<string, SpecOperation>();
	for (const [apiPath, item] of Object.entries(routes.paths)) {
		for (const [key, value] of Object.entries(item)) {
			const method = METHODS[key];
			const subject = `${key.toUpperCase()} ${apiPath}`;
			if (!method) throw new Error(`Cannot read ${subject}: the generator does not know "${key}".`);

			const operation = parse(operationSchema, value, subject);
			const { operationId } = operation;
			const tag = tagsByName.get(operation.tags[0]);
			if (!tag) {
				throw new Error(
					`Cannot read ${subject}: "${operation.tags[0]}" is not a tag with a parent.`,
				);
			}
			if (operations.has(operationId)) {
				throw new Error(`Cannot read ${subject}: two operations have the ID "${operationId}".`);
			}

			operations.set(operationId, {
				operationId,
				summary: operation.summary ?? '',
				method,
				apiPath,
				tag,
				deprecated: operation.deprecated === true,
				...readParameters(operation, options),
			});
		}
	}

	return {
		tags,
		operations: [...operations.values()].sort((a, b) => a.operationId.localeCompare(b.operationId)),
	};
}
