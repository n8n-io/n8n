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

export const projectFieldDocs = {
	id: { readOnly: true, example: 'VmwOO9HeTEj20kxM' },
	name: { example: 'Marketing' },
	type: { readOnly: true, example: 'team' },
	description: { example: 'Workflows the marketing team owns.' },
	creatorId: { example: 'f9a2cbb8-0b1e-4b64-9c1c-0d5f5f1f2a3b' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const projectListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through projects by setting the cursor parameter to a nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'eyJvZmZzZXQiOjEwMCwibGltaXQiOjEwMH0=',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const createdProjectFieldDocs = {
	role: { description: "The caller's role in the new project.", example: 'project:admin' },
	scopes: { description: 'Scopes the caller holds in the new project.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const createProjectReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true },
	type: { type: 'string', readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
