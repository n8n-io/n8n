import { path, t } from '@n8n/node-sdk';

import { driveIdOf, file } from '../google-drive.node';

export const deleteFile = file.action('delete', {
	action: 'Delete a file',
	summary: 'Move a file or folder to the trash, or delete it for good.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: true },
	input: {
		fileId: t.str().hint('File or folder ID or URL'),
		permanently: t.bool().default(false).hint('true skips the trash; it cannot be undone'),
	},
	output: t.obj({ id: t.str(), success: t.lit(true) }),
	async run({ input, http }) {
		const id = driveIdOf(input.fileId);
		const query = { supportsAllDrives: true };
		await (input.permanently
			? http.request({ method: 'DELETE', path: path`/drive/v3/files/${id}`, query })
			: http.request({
					method: 'PATCH',
					path: path`/drive/v3/files/${id}`,
					query,
					body: { trashed: true },
				}));
		return { id, success: true as const };
	},
});
