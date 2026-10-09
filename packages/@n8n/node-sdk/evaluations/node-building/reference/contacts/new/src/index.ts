import { createContact } from './actions/contact.create';
import { deleteContact } from './actions/contact.delete';
import { searchContacts } from './actions/contact.search';

export { node } from './contacts.node';

export const actions = [createContact, deleteContact, searchContacts];
