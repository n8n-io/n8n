import { defineNode, Schema, t, type JsonSchema } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

export const node = defineNode({
	id: 'contacts',
	displayName: 'Contacts',
	credential: credential({
		types: [
			defineCredential({
				id: 'contacts.apiToken',
				version: '1.0.0',
				legacyName: 'contactsApi',
				displayName: 'Contacts API',
				fields: { apiToken: field.secret('API Token') },
				auth: (a) => a.header('X-Contacts-Token', '{apiToken}'),
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/contacts/v1',
});

export const contacts = node.resource('contact');

const NULLABLE_STRING: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableString = () => new Schema<string | null>(NULLABLE_STRING, false);

export const contact = t.obj({
	id: t.num(),
	idStr: t.str(),
	email: t.str(),
	firstName: nullableString(),
	lastName: nullableString(),
	company: nullableString(),
	phone: nullableString(),
	tags: t.arr(t.str()),
});

export const tagsOf = (text: string | undefined) =>
	(text ?? '')
		.split(',')
		.map((tag) => tag.trim())
		.filter((tag) => tag !== '');
