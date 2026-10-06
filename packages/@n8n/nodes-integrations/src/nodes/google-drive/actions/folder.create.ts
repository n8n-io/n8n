import { parse, path, ref, t } from '@n8n/node-sdk';

import {
	driveFile,
	driveFolderId,
	driveIdOf,
	FILE_FIELDS,
	FOLDER_TYPE,
	folder,
} from '../google-drive.node';

export const createFolder = folder.action('create', {
	action: 'Create a folder',
	summary: 'Create a folder in Google Drive.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	minor: 1,
	input: {
		name: t.str().with({ minLength: 1 }).title('Folder Name'),
		parentId: ref(driveFolderId).title('Parent Folder').default('root'),
	},
	output: driveFile,
	async run({ input, http }) {
		const created = await http.request({
			method: 'POST',
			path: path`/drive/v3/files`,
			query: { supportsAllDrives: true, fields: FILE_FIELDS },
			body: { name: input.name, mimeType: FOLDER_TYPE, parents: [driveIdOf(input.parentId)] },
		});
		return parse(driveFile, created);
	},
});
