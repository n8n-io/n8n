import '../openapi-extend';
import { z } from 'zod';

/**
 * Ids stay strings because the services below these routes take them as strings. `.openapi({ type })`
 * replaces the derived schema, so the document reads `integer` over a string check.
 */
const numericIdParamSchema = (description: string) =>
	z
		.string()
		.regex(/^(?!0+$)\d+$/, 'must be a positive integer')
		.openapi({ type: 'integer', minimum: 1, param: { description } });

const stringIdParamSchema = (description: string) => z.string().openapi({ param: { description } });

export const executionIdParamSchema = numericIdParamSchema('The ID of the execution.');

export const workflowIdParamSchema = stringIdParamSchema('The ID of the workflow.');
export const workflowVersionIdParamSchema = stringIdParamSchema('The ID of the workflow version.');
export const projectIdParamSchema = stringIdParamSchema('The ID of the project.');
export const roleSlugParamSchema = stringIdParamSchema('The slug of the role.');
export const roleMappingRuleIdParamSchema = stringIdParamSchema('The ID of the role mapping rule.');
export const gitConnectionIdParamSchema = stringIdParamSchema('The ID of the git connection.');
export const credentialIdParamSchema = stringIdParamSchema('The ID of the credential.');
