import { path, t } from '@n8n/node-sdk';

import { contacts } from '../contacts.node';

export const deleteContact = contacts.action('delete', {
	action: 'Delete a contact',
	summary: 'Delete a contact by its ID.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: true },
	input: { contactId: t.str().title('Contact ID') },
	output: t.obj({ deleted: t.bool() }),
	async run({ input, http }) {
		await http.request({ method: 'DELETE', path: path`/contacts/${input.contactId}` });
		return { deleted: true };
	},
});
