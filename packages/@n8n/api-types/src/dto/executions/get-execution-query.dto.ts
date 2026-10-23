import '../../openapi-extend';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class GetExecutionQueryDto extends Z.class({
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
}) {}
