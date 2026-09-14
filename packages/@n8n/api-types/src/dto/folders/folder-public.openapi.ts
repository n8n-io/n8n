import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import { alsoNullable } from '../openapi-nullable';

export const folderFieldDocs = {
	id: { readOnly: true, example: 'zLXWgYyZrZ4Gn1Vk' },
	name: { example: 'My Folder' },
	parentFolderId: { example: 'kRZ0ewrAEAhCkTBd' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
	workflowCount: { description: 'Number of workflows the folder holds.', readOnly: true },
	subFolderCount: { description: 'Number of folders the folder holds.', readOnly: true },
	path: {
		description: 'Names of every folder from the project root down to this folder.',
		readOnly: true,
		example: ['Marketing', 'Campaigns'],
	},
} satisfies Record<string, ZodOpenAPIMetadata>;

export const folderProjectFieldDocs = {
	id: { readOnly: true, example: 'VmwOO9HeTEj20kxM' },
	name: { example: 'Marketing' },
	type: { readOnly: true, example: 'team' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/**
 * `icon` is a JSON column, so the schema only guards the basic type and this metadata carries the
 * shape. Same reasoning as `projectIconOpenApi`, but the folder route returns a reduced project.
 */
export const folderProjectIconOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	description: 'Icon of the project, or null when the project has none',
	properties: {
		type: { type: 'string', enum: ['emoji', 'icon'] },
		value: { type: 'string' },
		color: { type: 'string' },
	},
	required: ['type', 'value'],
});

export const folderListFieldDocs = {
	count: { description: 'Total number of folders matching the query.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const folderListQueryFieldDocs = {
	filter: {
		type: 'string',
		description:
			'JSON-encoded filter object. Supported fields — parentFolderId, name, tags (array of tag names), excludeFolderIdAndDescendants.',
		example: '{"parentFolderId":"abc123","name":"My Folder"}',
	},
	select: {
		type: 'string',
		description:
			'JSON-encoded array of fields to include. Valid fields — id, name, createdAt, updatedAt, project, tags, parentFolder, workflowCount, subFolderCount, path.',
		example: '["id","name","tags","workflowCount"]',
	},
	sortBy: { description: 'Sort order for results.' },
	skip: { type: 'string', description: 'Number of items to skip for pagination. Defaults to 0.' },
	take: { type: 'string', description: 'Number of items to return. Defaults to 10.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const folderContentCountFieldDocs = {
	totalSubFolders: { description: 'Total number of sub-folders (recursive).' },
	totalWorkflows: { description: 'Total number of workflows (recursive).' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/**
 * Copied from the hand-written `folder.update.yml`. Both fields carry `type` because the runtime
 * schemas behind them are refinements, which alone would not document as a plain `string`.
 */
export const updateFolderFieldDocs = {
	name: { type: 'string', example: 'Renamed Folder' },
	parentFolderId: {
		type: 'string',
		description:
			'ID of the parent folder to move this folder into. Set to "0" to move the folder to the project root.',
		example: 'abc123',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/** Copied from the hand-written folder YAML so the generated spec keeps the same wording. */
export const deleteFolderQueryFieldDocs = {
	transferToFolderId: {
		description:
			'Optional target folder ID to move workflows and sub-folders into before deleting.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
