import * as z from 'zod';

import { parseAllOf } from './parse-all-of';
import { parseAnyOf } from './parse-any-of';
import { parseOneOf } from './parse-one-of';
import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, Refs } from '../types';
import { its } from '../utils/its';

export function parseObject(
	objectSchema: JsonSchemaObject & { type: 'object' },
	refs: Refs,
): z.ZodTypeAny {
	let zodSchema: z.ZodObject<Record<string, z.ZodTypeAny>, 'strip', z.ZodTypeAny> | undefined =
		undefined;

	if (objectSchema.properties) {
		if (!Object.keys(objectSchema.properties).length) {
			zodSchema = z.object({});
		} else {
			const properties: Record<string, z.ZodTypeAny> = {};

			for (const key of Object.keys(objectSchema.properties)) {
				const propJsonSchema = objectSchema.properties[key];

				const propZodSchema = parseSchema(propJsonSchema, {
					...refs,
					path: [...refs.path, 'properties', key],
				});

				const hasDefault =
					typeof propJsonSchema === 'object' && propJsonSchema.default !== undefined;

				const required = Array.isArray(objectSchema.required)
					? objectSchema.required.includes(key)
					: typeof propJsonSchema === 'object' && propJsonSchema.required === true;

				const isOptional = !hasDefault && !required;

				properties[key] = isOptional ? propZodSchema.optional() : propZodSchema;
			}

			zodSchema = z.object(properties);
		}
	}

	const additionalProperties =
		objectSchema.additionalProperties !== undefined
			? parseSchema(objectSchema.additionalProperties, {
					...refs,
					path: [...refs.path, 'additionalProperties'],
				})
			: undefined;

	// let patternProperties: z.ZodTypeAny | undefined = undefined;
	const patternProperties: string | undefined = undefined;

	// TODO: Pattern properties
	if (objectSchema.patternProperties) {
		throw new Error('patternProperties not implemented');
		// const parsedPatternProperties = Object.fromEntries(
		// 	Object.entries(objectSchema.patternProperties).map(([key, value]) => {
		// 		return [
		// 			key,
		// 			parseSchema(value, {
		// 				...refs,
		// 				path: [...refs.path, 'patternProperties', key],
		// 			}),
		// 		];
		// 	}, {}),
		// );

		// patternProperties = '';

		// if (zodSchema) {
		// 	if (additionalProperties) {
		// 		patternProperties += `.catchall(z.union([${[
		// 			...Object.values(parsedPatternProperties),
		// 			additionalProperties,
		// 		].join(', ')}]))`;
		// 	} else if (Object.keys(parsedPatternProperties).length > 1) {
		// 		patternProperties += `.catchall(z.union([${Object.values(parsedPatternProperties).join(
		// 			', ',
		// 		)}]))`;
		// 	} else {
		// 		patternProperties += `.catchall(${Object.values(parsedPatternProperties)})`;
		// 	}
		// } else {
		// 	if (additionalProperties) {
		// 		patternProperties += `z.record(z.union([${[
		// 			...Object.values(parsedPatternProperties),
		// 			additionalProperties,
		// 		].join(', ')}]))`;
		// 	} else if (Object.keys(parsedPatternProperties).length > 1) {
		// 		patternProperties += `z.record(z.union([${Object.values(parsedPatternProperties).join(
		// 			', ',
		// 		)}]))`;
		// 	} else {
		// 		patternProperties += `z.record(${Object.values(parsedPatternProperties)})`;
		// 	}
		// }

		// patternProperties += '.superRefine((value, ctx) => {\n';

		// patternProperties += 'for (const key in value) {\n';

		// if (additionalProperties) {
		// 	if (objectSchema.properties) {
		// 		patternProperties += `let evaluated = [${Object.keys(objectSchema.properties)
		// 			.map((key) => JSON.stringify(key))
		// 			.join(', ')}].includes(key)\n`;
		// 	} else {
		// 		patternProperties += `let evaluated = false\n`;
		// 	}
		// }

		// for (const key in objectSchema.patternProperties) {
		// 	patternProperties += 'if (key.match(new RegExp(' + JSON.stringify(key) + '))) {\n';
		// 	if (additionalProperties) {
		// 		patternProperties += 'evaluated = true\n';
		// 	}
		// 	patternProperties +=
		// 		'const result = ' + parsedPatternProperties[key] + '.safeParse(value[key])\n';
		// 	patternProperties += 'if (!result.success) {\n';

		// 	patternProperties += `ctx.addIssue({
		//       path: [...ctx.path, key],
		//       code: 'custom',
		//       message: \`Invalid input: Key matching regex /\${key}/ must match schema\`,
		//       params: {
		//         issues: result.error.issues
		//       }
		//     })\n`;

		// 	patternProperties += '}\n';
		// 	patternProperties += '}\n';
		// }

		// if (additionalProperties) {
		// 	patternProperties += 'if (!evaluated) {\n';
		// 	patternProperties += 'const result = ' + additionalProperties + '.safeParse(value[key])\n';
		// 	patternProperties += 'if (!result.success) {\n';

		// 	patternProperties += `ctx.addIssue({
		//       path: [...ctx.path, key],
		//       code: 'custom',
		//       message: \`Invalid input: must match catchall schema\`,
		//       params: {
		//         issues: result.error.issues
		//       }
		//     })\n`;

		// 	patternProperties += '}\n';
		// 	patternProperties += '}\n';
		// }
		// patternProperties += '}\n';
		// patternProperties += '})';
	}

	let output: z.ZodTypeAny;
	if (zodSchema) {
		if (patternProperties) {
			// TODO: Implement patternProperties
			// output = schema + patternProperties;
			output = zodSchema;
		} else if (additionalProperties) {
			if (additionalProperties instanceof z.ZodNever) {
				output = zodSchema.strict();
			} else {
				output = zodSchema.catchall(additionalProperties);
			}
		} else {
			output = zodSchema;
		}
	} else {
		if (patternProperties) {
			output = z.any(); //patternProperties;
		} else if (additionalProperties) {
			output = z.record(additionalProperties);
		} else {
			output = z.record(z.any());
		}
	}

	if (its.an.anyOf(objectSchema)) {
		output = output.and(
			parseAnyOf(
				{
					...objectSchema,
					anyOf: objectSchema.anyOf.map((x) =>
						typeof x === 'object' &&
						!x.type &&
						(x.properties ?? x.additionalProperties ?? x.patternProperties)
							? { ...x, type: 'object' }
							: x,
					),
				},
				refs,
			),
		);
	}

	if (its.a.oneOf(objectSchema)) {
		output = output.and(
			parseOneOf(
				{
					...objectSchema,
					oneOf: objectSchema.oneOf.map((x) =>
						typeof x === 'object' &&
						!x.type &&
						(x.properties ?? x.additionalProperties ?? x.patternProperties)
							? { ...x, type: 'object' }
							: x,
					),
				},
				refs,
			),
		);
	}

	if (its.an.allOf(objectSchema)) {
		output = output.and(
			parseAllOf(
				{
					...objectSchema,
					allOf: objectSchema.allOf.map((x) =>
						typeof x === 'object' &&
						!x.type &&
						(x.properties ?? x.additionalProperties ?? x.patternProperties)
							? { ...x, type: 'object' }
							: x,
					),
				},
				refs,
			),
		);
	}

	return output;
}
