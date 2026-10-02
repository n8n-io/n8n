import { compat, credential, defineNode, obj, str } from '@n8n/node-sdk';

export const googleDrive = defineNode({
	id: 'googleDrive',
	displayName: 'Google Drive',
	credential: credential({
		types: [compat('googleDriveOAuth2Api', { hosts: ['www.googleapis.com'] })],
	}),
	baseUrl: 'https://www.googleapis.com',
});

/** A file or folder ID, from an ID or a Drive URL. It goes into a request path, so it is checked. */
export function driveIdOf(value: string) {
	const id = /\/(?:folders|d)\/([-_a-zA-Z0-9]+)/.exec(value)?.[1] ?? value;
	if (!/^[-_a-zA-Z0-9]+$/.test(id)) throw new Error(`Not a Google Drive ID or URL: ${value}`);
	return id;
}

export const FOLDER_TYPE = 'application/vnd.google-apps.folder';

/** The fields each action asks for, so each output has the link to the file. */
export const FILE_FIELDS = 'kind,id,name,mimeType,webViewLink';

export const driveFile = obj({
	kind: str().optional(),
	id: str(),
	name: str(),
	mimeType: str(),
	webViewLink: str().hint('The link that opens the file in Drive').optional(),
});

export const file = googleDrive.resource('file');

export const folder = googleDrive.resource('folder');
