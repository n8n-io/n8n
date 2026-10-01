import { defineNode } from '@n8n/node-sdk';

export const gmail = defineNode({
	id: 'gmail',
	displayName: 'Gmail',
	credentials: ['gmailOAuth2'],
	baseUrl: 'https://www.googleapis.com/gmail/v1/users/me',
});

export const message = gmail.resource('message');
