import { defineNode, defineResource, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { gmailOAuth2 } from './credentials';

export const gmail = defineNode({
	id: 'gmail',
	displayName: 'Gmail',
	credential: credential({ types: [gmailOAuth2] }),
	baseUrl: 'https://www.googleapis.com/gmail/v1/users/me',
});

export const message = gmail.resource('message');

/** A label of the mailbox, e.g. INBOX or a user label. */
export const gmailLabel = defineResource({
	id: 'gmail.label',
	label: 'Label',
	shape: { 'x-n8n-hint': 'Label ID, not the name, e.g. INBOX or Label_12' },
	list: {
		request: { path: '/labels' },
		response: t.obj({ labels: t.arr(t.obj({ id: t.str(), name: t.str() })) }),
		items: 'labels',
		item: { id: '{id}', label: '{name}' },
		search: 'label',
	},
});
