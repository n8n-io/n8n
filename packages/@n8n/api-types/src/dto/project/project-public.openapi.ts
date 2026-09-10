import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import { alsoNullable } from '../openapi-nullable';

export const projectIconOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	description: 'Icon of the project, or null when the project has none',
	properties: {
		type: { type: 'string', enum: ['emoji', 'icon'] },
		value: { type: 'string' },
		color: { type: 'string' },
	},
	required: ['type', 'value'],
});
