import '../openapi-extend';
import { z } from 'zod';

/**
 * The value stays a string. Path segments arrive as strings and the services below these routes
 * take the id as one, so coercing to a number here would only force it back at every call site.
 * `.openapi({ type })` replaces the derived `string` schema rather than merging into it, so the
 * digit check stays out of the published document while `type: integer` describes the parameter.
 */
const numericIdParamSchema = (description: string) =>
	z
		.string()
		.regex(/^(?!0+$)\d+$/, 'must be a positive integer')
		.openapi({ type: 'integer', minimum: 1, description });

const stringIdParamSchema = (description: string) => z.string().openapi({ description });

export const executionIdParamSchema = numericIdParamSchema('The ID of the execution.');

export const workflowIdParamSchema = stringIdParamSchema('The ID of the workflow.');
export const workflowVersionIdParamSchema = stringIdParamSchema('The ID of the workflow version.');
export const projectIdParamSchema = stringIdParamSchema('The ID of the project.');
export const roleSlugParamSchema = stringIdParamSchema('The slug of the role.');
export const roleMappingRuleIdParamSchema = stringIdParamSchema('The ID of the role mapping rule.');
export const gitConnectionIdParamSchema = stringIdParamSchema('The ID of the git connection.');
