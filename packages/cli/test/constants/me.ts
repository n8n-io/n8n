export const ROUTES: readonly string[] = [
	'GET /me',
	'PATCH /me',
	'PATCH /me/password',
	'POST /me/survey',
];

const email = 'test@n8n.io';
const password = 'abcd1234';
const firstName = 'John';
const lastName = 'Smith';

export const PAYLOADS = {
	PROFILE: {
		email,
		firstName,
		lastName,
	},
	PASSWORD: {
		password,
	},
	SURVEY: {
		// TODO: Find proper examples
		codingSkill: 'a',
		companyIndustry: 'b',
		companySize: 'c',
		otherCompanyIndustry: 'd',
		otherWorkArea: 'e',
		workArea: 'f',
	},
	OWNER_SETUP: {
		email,
		firstName,
		lastName,
		password,
	},
	OWNER_LOGIN: {
		email,
		password,
	},
};
