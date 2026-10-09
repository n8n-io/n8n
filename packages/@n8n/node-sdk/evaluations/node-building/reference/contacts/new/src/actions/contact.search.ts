import { matches, path, t, UserError } from '@n8n/node-sdk';

import { contact, contacts, tagsOf } from '../contacts.node';

export const searchContacts = contacts.action('search', {
	action: 'Search contacts',
	summary: 'List the contacts that have every given tag.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: { tags: t.str().title('Tags').optional() },
	output: contact,
	async *run({ input, http }) {
		const found = await http.request({
			path: path`/contacts`,
			query: { tags: tagsOf(input.tags) },
		});
		if (!matches(t.arr(contact), found))
			throw new UserError('Contacts returned an unexpected list');
		yield* found;
	},
});
