import '../../openapi-extend';
import { z } from 'zod';

import { variableValueSchema } from './base.dto';
import { strictVariableKeySchema } from './create-variable-request.dto';
import { variableKeySchema } from './update-variable-request.dto';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

const readOnlyStringSchema = () => readOnlyPublicSchema({ type: 'string', readOnly: true });

const variableProjectIdSchema = z.string().max(36).openapi({ example: 'VmwOO9HeTEj20kxM' });

const variablePublicValueSchema = variableValueSchema.openapi({ example: 'test' });

export class CreateVariablePublicDto extends Z.class(
	{
		id: readOnlyStringSchema(),
		key: strictVariableKeySchema,
		value: variablePublicValueSchema,
		type: readOnlyStringSchema(),
		projectId: variableProjectIdSchema.optional(),
	},
	{ strict: true },
) {}

/**
 * `key` takes the legacy form, which allows a leading digit, because an existing variable may
 * carry such a key. `VariablesService` enforces the stricter create form only when the key
 * changes.
 */
export class UpdateVariablePublicDto extends Z.class(
	{
		id: readOnlyStringSchema(),
		key: variableKeySchema,
		value: variablePublicValueSchema,
		type: readOnlyStringSchema(),
		projectId: variableProjectIdSchema.nullable().optional(),
	},
	{ strict: true },
) {}
