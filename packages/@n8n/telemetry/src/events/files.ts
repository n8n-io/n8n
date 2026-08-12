import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const FILES_TELEMETRY = defineTelemetryEvents({
	USER_UPLOADED_PROJECT_FILE: {
		name: 'User uploaded project file',
		description:
			'User stored a file in a project through the Files UI — via the Add file button, drag-and-drop, or the replace action.',
		properties: z.object({
			mime_family: z
				.string()
				.describe("Top-level mime family of the uploaded file, e.g. 'image' or 'text'"),
			size_bucket: z
				.enum(['<1mb', '1-10mb', '10-50mb', '>50mb'])
				.describe('Coarse size of the uploaded file'),
			source: z.enum(['button', 'drop', 'replace']).describe('UI surface the upload came from'),
			conflict_resolution: z
				.enum(['replace', 'keepBoth', 'cancel'])
				.optional()
				.describe('Choice made in the name-conflict dialog, when one appeared'),
		}),
	},
	USER_PREVIEWED_PROJECT_FILE: {
		name: 'User previewed project file',
		description: 'User opened the file preview panel in the Files UI.',
		properties: z.object({
			viewable: z
				.boolean()
				.describe('Whether the mime type rendered inline or fell back to metadata + download'),
		}),
	},
	USER_DELETED_PROJECT_FILE: {
		name: 'User deleted project file',
		description: 'User deleted one or more files through the Files UI.',
		properties: z.object({
			mode: z.enum(['single', 'bulk']).describe('Row action vs multi-select bulk delete'),
			count: z.number().describe('Number of files deleted'),
		}),
	},
	USER_HIT_FILE_STORAGE_LIMIT: {
		name: 'User hit file storage limit',
		description: 'A write was rejected because the instance-wide file storage quota is exhausted.',
		properties: z.object({
			total_bytes: z.number().describe('Bytes in use when the write was rejected'),
			max_bytes: z.number().describe('Configured instance-wide quota'),
			surface: z
				.enum(['ui-upload', 'node-write'])
				.describe('Whether a UI upload or a Files-node write hit the limit'),
		}),
	},
	FILES_NODE_EXECUTED: {
		name: 'Files node executed',
		description:
			'A Files node ran, reported on first use per workflow per instance runtime — not per run, which would be high-volume.',
		properties: z.object({
			operation: z
				.enum(['download', 'upload', 'getMany', 'deleteFile'])
				.describe('Files node operation'),
		}),
	},
	USER_INSERTED_FILES_EXPRESSION: {
		name: 'User inserted $files expression',
		description: 'User added a $files(...) expression in the editor.',
		properties: z.object({
			source: z
				.enum(['autocomplete', 'typed'])
				.describe('Whether the completion was applied or the expression typed by hand'),
		}),
	},
});
