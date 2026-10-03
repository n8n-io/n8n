import '../../openapi-extend';

import { z } from 'zod';

import { logStreamingEventTypesFieldDocs } from './log-streaming-public.openapi';
import { Z } from '../../zod-class';

const logStreamingEventTypesPublicSchema = z
	.object({
		data: z.array(z.string()).openapi(logStreamingEventTypesFieldDocs.data),
	})
	.openapi({ additionalProperties: false });

export class LogStreamingEventTypesPublicDto extends Z.class(
	logStreamingEventTypesPublicSchema.shape,
) {
	static schema = logStreamingEventTypesPublicSchema;
}
