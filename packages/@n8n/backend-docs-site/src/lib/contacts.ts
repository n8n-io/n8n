import contacts from '../data/contacts.json';

// GitHub login to full name, for the people that the pages name as their contact.
const NAMES: Record<string, string> = contacts;

export interface Contact {
	login: string;
	name: string;
	url: string;
	avatar: string;
}

const firstName = (name: string) => name.split(' ')[0];

/** Returns the contact for a login. The name is the first name, unless two contacts share it. */
export function contactFor(login: string): Contact {
	const fullName = NAMES[login];
	if (!fullName)
		throw new Error(`Unknown contact "${login}". Add the login to src/data/contacts.json.`);
	const shared =
		Object.values(NAMES).filter((other) => firstName(other) === firstName(fullName)).length > 1;
	return {
		login,
		name: shared ? fullName : firstName(fullName),
		url: `https://github.com/${login}`,
		avatar: `https://github.com/${login}.png?size=40`,
	};
}
