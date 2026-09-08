import '../openapi-extend';
import { z } from 'zod';

/**
 * Runtime: the id stays a string, because the services these routes call expect a string.
 * Docs: `.openapi({ type })` overrides them, so they show `integer`.
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
