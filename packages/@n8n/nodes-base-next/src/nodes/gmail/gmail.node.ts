import { compat, credential, defineNode } from '@n8n/node-sdk';

export const gmail = defineNode({
	id: 'gmail',
	displayName: 'Gmail',
	credential: credential({ types: [compat('gmailOAuth2', { hosts: ['www.googleapis.com'] })] }),
	baseUrl: 'https://www.googleapis.com/gmail/v1/users/me',
});

export const message = gmail.resource('message');
