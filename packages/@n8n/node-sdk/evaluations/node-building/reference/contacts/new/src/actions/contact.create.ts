import { matches, path, t, UserError } from '@n8n/node-sdk';

import { contact, contacts, tagsOf } from '../contacts.node';

export const createContact = contacts.action('create', {
	action: 'Create a contact',
	summary: 'Create a contact and add its tags.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: {
		email: t.str().title('Email'),
		firstName: t.str().title('First Name').optional(),
		lastName: t.str().title('Last Name').optional(),
		tags: t.str().title('Tags').optional(),
		additionalFields: t
			.obj({
				company: t.str().title('Company').optional(),
				phone: t.str().title('Phone').optional(),
			})
			.title('Additional Fields')
			.optional(),
	},
	output: contact,
	async run({ input, http }) {
		const body = Object.fromEntries(
			Object.entries({
				email: input.email,
				firstName: input.firstName,
				lastName: input.lastName,
				company: input.additionalFields?.company,
				phone: input.additionalFields?.phone,
			}).filter(([, value]) => value !== undefined && value !== ''),
		);
		const created = await http.request({ method: 'POST', path: path`/contacts`, body });
		if (!matches(contact, created)) throw new UserError('Contacts returned an unexpected contact');
		const tags = tagsOf(input.tags);
		if (tags.length === 0) return created;
		const tagged = await http.request({
			method: 'POST',
			path: path`/contacts/${created.idStr}/tags`,
			body: { tags },
		});
		if (!matches(contact, tagged)) throw new UserError('Contacts returned an unexpected contact');
		return tagged;
	},
});
