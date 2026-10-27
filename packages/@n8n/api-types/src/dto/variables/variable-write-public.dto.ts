import '../../openapi-extend';
import { z } from 'zod';

import { variableValueSchema } from './base.dto';
import { strictVariableKeySchema } from './create-variable-request.dto';
import { variableKeySchema } from './update-variable-request.dto';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

const variableProjectIdSchema = z.string().max(36).openapi({ example: 'VmwOO9HeTEj20kxM' });

const variablePublicValueSchema = variableValueSchema.openapi({ example: 'test' });

export class CreateVariablePublicDto extends Z.class(
	{
		id: readOnlyPublicSchema({ type: 'string', readOnly: true }),
		key: strictVariableKeySchema,
		value: variablePublicValueSchema,
		type: readOnlyPublicSchema({ type: 'string', readOnly: true }),
		projectId: variableProjectIdSchema.optional(),
	},
	{ strict: true },
) {}

export class UpdateVariablePublicDto extends Z.class(
	{
		id: readOnlyPublicSchema({ type: 'string', readOnly: true }),
		key: variableKeySchema,
		value: variablePublicValueSchema,
		type: readOnlyPublicSchema({ type: 'string', readOnly: true }),
		projectId: variableProjectIdSchema.nullable().optional(),
	},
	{ strict: true },
) {}
