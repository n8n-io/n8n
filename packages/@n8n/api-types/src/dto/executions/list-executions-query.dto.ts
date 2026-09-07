import '../../openapi-extend';

import { ExecutionStatusList } from 'n8n-workflow';
import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export class ListExecutionsQueryDto extends Z.class({
	includeData: booleanFromString
		.optional()
		.default('false')
		.openapi({ description: "Whether or not to include the execution's detailed data." }),
	ignoreDataSizeLimit: booleanFromString
		.optional()
		.default('false')
		.openapi({
			description:
				'Whether to return the full execution data even if it exceeds the configured size limit ' +
				'(EXECUTIONS_DATA_MAX_DISPLAY_SIZE). Oversized executions are otherwise returned without ' +
				'their data.',
		}),
	redactExecutionData: booleanFromString.optional().openapi({
		description:
			'Controls execution data redaction. When `true`, execution output data is always redacted. ' +
			'When `false`, requests unredacted (revealed) data — requires the `execution:reveal` scope. ' +
			'When omitted, follows the workflow redaction policy.',
	}),
	status: z
		.enum(ExecutionStatusList)
		.optional()
		.openapi({ description: 'Status to filter the executions by.' }),
	workflowId: z
		.string()
		.optional()
		.openapi({ description: 'Workflow to filter the executions by.', example: '1000' }),
	projectId: z.string().optional().openapi({ example: 'VmwOO9HeTEj20kxM' }),
	// `{ offset: true }` matches the legacy `format: date-time` check exactly: it accepts `Z` and a
	// numeric offset, and rejects a value with no timezone.
	startedAfter: z.string().datetime({ offset: true }).optional().openapi({
		description: 'Only return executions that started after this time.',
		example: '2024-01-01T00:00:00.000Z',
	}),
	startedBefore: z.string().datetime({ offset: true }).optional().openapi({
		description: 'Only return executions that started before this time.',
		example: '2024-12-31T23:59:59.999Z',
	}),
	// `limit` only. Spreading the schema would expose `offset`, which is not a public query param.
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
