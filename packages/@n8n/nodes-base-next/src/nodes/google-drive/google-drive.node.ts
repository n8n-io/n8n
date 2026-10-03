import { defineNode, t, UserError } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { googleOAuth2 } from '../google-oauth2';

export const googleDriveOAuth2 = googleOAuth2({
	id: 'googleDrive.oauth2',
	legacyName: 'googleDriveOAuth2Api',
	displayName: 'Google Drive OAuth2 API',
	hosts: ['www.googleapis.com'],
	scope: [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.appdata',
		'https://www.googleapis.com/auth/drive.photos.readonly',
	],
	notice:
		'Make sure that you have enabled the Google Drive API in the Google Cloud Console. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
});

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

export const file = googleDrive.resource('file');

export const folder = googleDrive.resource('folder');
