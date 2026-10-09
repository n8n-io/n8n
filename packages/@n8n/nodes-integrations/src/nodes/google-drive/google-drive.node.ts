import { defineNode, defineResource, t, UserError } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { googleDriveOAuth2 } from './credentials';

export const googleDrive = defineNode({
	id: 'googleDrive',
	displayName: 'Google Drive',
	credential: credential({ types: [googleDriveOAuth2] }),
	baseUrl: 'https://www.googleapis.com',
});

/** A file or folder ID, from an ID or a Drive URL. It goes into a request path, so it is checked. */
export function driveIdOf(value: string) {
	const id = /\/(?:folders|d)\/([-_a-zA-Z0-9]+)/.exec(value)?.[1] ?? value;
	if (!/^[-_a-zA-Z0-9]+$/.test(id)) throw new UserError(`Not a Google Drive ID or URL: ${value}`);
	return id;
}

export const FOLDER_TYPE = 'application/vnd.google-apps.folder';

/** The fields each action asks for, so each output has the link to the file. */
export const FILE_FIELDS = 'kind,id,name,mimeType,webViewLink';

/** Drive may leave out a field, so each field is optional and nullable. */
export const driveFile = t.loose(
	t.obj({
		kind: t.str().optional(),
		id: t.str(),
		name: t.str(),
		mimeType: t.str(),
		webViewLink: t.str().hint('The link that opens the file in Drive').optional(),
	}),
);

/** The files and folders the credential can see, as `query` narrows them, up to the lookup limit. */
const driveList = (query: string) =>
	({
		request: {
			path: '/drive/v3/files',
			query: {
				q: query,
				fields: 'nextPageToken,files(id,name,webViewLink)',
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			},
		},
		response: t.obj({
			files: t.arr(t.obj({ id: t.str(), name: t.str(), webViewLink: t.str().optional() })),
			nextPageToken: t.str().optional(),
		}),
		items: 'files',
		item: {
			id: (entry: { id: string }) => entry.id,
			label: (entry: { name: string }) => entry.name,
			url: (entry: { webViewLink?: string }) => entry.webViewLink,
		},
		pages: {
			style: 'cursor',
			next: 'nextPageToken',
			send: { query: 'pageToken' },
			size: { query: 'pageSize', max: 100 },
		},
		// A name search needs Drive query syntax, which a template cannot quote.
		search: 'label',
	}) as const;

export const driveFileId = defineResource({
	id: 'googleDrive.file',
	label: 'File',
	shape: { 'x-n8n-hint': 'File or folder ID or URL' },
	list: driveList('trashed = false'),
});

export const driveFolderId = defineResource({
	id: 'googleDrive.folder',
	label: 'Folder',
	shape: { 'x-n8n-hint': 'Folder or shared drive ID or URL; root is My Drive' },
	list: driveList(`mimeType = '${FOLDER_TYPE}' and trashed = false`),
});

export const file = googleDrive.resource('file');

export const folder = googleDrive.resource('folder');
