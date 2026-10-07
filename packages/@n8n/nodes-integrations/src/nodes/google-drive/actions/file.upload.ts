import { OperationalError, parse, path, ref, t } from '@n8n/node-sdk';

import { driveFile, driveFolderId, driveIdOf, file, FILE_FIELDS } from '../google-drive.node';

/** The session response: its `location` header is the upload URL. */
const uploadSession = t
	.obj({
		headers: t.obj({ location: t.str() }).with({ additionalProperties: true }),
	})
	.with({ additionalProperties: true });

/**
 * The upload response is open: the file exists when it arrives, so an extra field must not
 * fail the action. Unverified that Drive applies the session `fields` to it.
 */
const uploadedFile = driveFile.with({ additionalProperties: true });

export const uploadFile = file.action('upload', {
	action: 'Upload a file',
	summary: 'Upload a file to Google Drive. The bytes stream from n8n binary storage.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	version: '1.1.0',
	input: {
		file: t
			.binary()
			.title('Input Data Field Name')
			.hint('The file to upload, e.g. (item) => item.binary.data'),
		name: t
			.str()
			.title('File Name')
			.hint('The name in Drive; the file name of the binary when not set')
			.optional(),
		folderId: ref(driveFolderId).title('Parent Folder').default('root'),
	},
	output: driveFile,
	async run({ input, http }) {
		const { meta } = input.file;
		// A resumable upload streams the file as the body; it never goes into a multipart buffer.
		const session = await http.request({
			method: 'POST',
			path: path`/upload/drive/v3/files`,
			query: {
				uploadType: 'resumable',
				supportsAllDrives: true,
				fields: FILE_FIELDS,
			},
			headers: {
				'X-Upload-Content-Type': meta.mimeType,
				...(meta.bytes === undefined ? {} : { 'X-Upload-Content-Length': String(meta.bytes) }),
			},
			body: {
				name: input.name ?? meta.fileName ?? 'Untitled',
				parents: [driveIdOf(input.folderId)],
			},
			fullResponse: true,
		});
		const location = parse(uploadSession, session).headers?.location;
		if (!location) throw new OperationalError('Google Drive gave no upload URL for the file');
		const uploaded = await http.request({ method: 'PUT', url: location, body: input.file });
		const { kind, id, name, mimeType, webViewLink } = parse(uploadedFile, uploaded);
		return {
			...(kind === undefined || kind === null ? {} : { kind }),
			id,
			name,
			mimeType,
			...(webViewLink === undefined || webViewLink === null ? {} : { webViewLink }),
		};
	},
});
