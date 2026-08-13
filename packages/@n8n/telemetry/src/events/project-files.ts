import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const PROJECT_FILES_TELEMETRY = defineTelemetryEvents({
	USER_UPLOADED_PROJECT_FILE: {
		name: 'User uploaded project file',
		description:
			"A file was stored against a project through POST /projects/:projectId/files. Fires once per successful upload, after the bytes are committed to binary data storage and the metadata row is written — so uploads rejected for size, quota, or a name collision emit nothing, and a replaced file emits one event with overwrote_existing set rather than a delete plus an upload. project_type separates the shared instance-wide personal budget from a team project's own, and n8n_binary_data_mode reports which storage backend actually received the bytes.",
		properties: z.object({
			user_id: z.string(),
			project_id: z.string(),
			project_type: z
				.enum(['personal', 'team'])
				.describe(
					'Personal projects draw on one instance-wide storage budget; team projects have their own',
				),
			mime_type: z.string().describe('Client-declared MIME type; no type filtering is applied'),
			file_size_bytes: z.number(),
			overwrote_existing: z
				.boolean()
				.describe('Whether this replaced the content of an existing file of the same name'),
			n8n_binary_data_mode: z.enum(['default', 'filesystem', 's3', 'azure', 'database']),
		}),
	},
});
