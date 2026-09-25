import '../openapi-extend';
import validator from 'validator';
import { z } from 'zod';

import { promotionDirectionSchema } from '../dto/promotions/promotion-config.dto';

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
export const testRunIdParamSchema = stringIdParamSchema('The ID of the test run.');
export const projectIdParamSchema = stringIdParamSchema('The ID of the project.');
export const tagIdParamSchema = stringIdParamSchema('The ID of the tag.');
export const folderIdParamSchema = stringIdParamSchema('The ID of the folder.');
export const userIdParamSchema = stringIdParamSchema('The ID of the user.');
export const userIdentifierParamSchema = z
	.string()
	.refine((value) => validator.isUUID(value) || validator.isEmail(value), {
		message: 'must be a valid ID or email',
	})
	.openapi({ param: { description: 'The ID or email of the user.' } });
export const userUuidParamSchema = z
	.string()
	.refine((value) => validator.isUUID(value), { message: 'must be a valid ID' })
	.openapi({ param: { description: 'The ID of the user.' } });
export const roleSlugParamSchema = stringIdParamSchema('The slug of the role.');
export const roleMappingRuleIdParamSchema = stringIdParamSchema('The ID of the role mapping rule.');
export const promotionConnectionIdParamSchema = stringIdParamSchema(
	'The ID of the promotion connection.',
);
export const promotionProviderIdParamSchema = stringIdParamSchema(
	'The ID of the promotion provider.',
);

export const promotionDirectionParamSchema = z.string().openapi({
	enum: [...promotionDirectionSchema.options],
	param: { description: 'The direction of the promotion: apply or promote.' },
});
export const credentialIdParamSchema = stringIdParamSchema('The ID of the credential.');
export const credentialTypeNameParamSchema = stringIdParamSchema(
	'The credential type name that you want to get the schema for',
);
export const variableIdParamSchema = stringIdParamSchema('The ID of the variable.');
export const nodeTypePolicyIdParamSchema = stringIdParamSchema(
	'The ID of the node type policy document.',
);
export const nodeTypePolicyScopeIdParamSchema = stringIdParamSchema(
	'The ID of the node type policy scope.',
);
export const credentialTypePolicyIdParamSchema = stringIdParamSchema(
	'The ID of the credential type policy document.',
);
export const credentialTypePolicyScopeIdParamSchema = stringIdParamSchema(
	'The ID of the credential type policy scope.',
);
