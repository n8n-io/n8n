export const ROUTES = [
	'GET /me',
	'PATCH /me',
	'PATCH /me/password',
	'POST /me/survey',
];

export const TEST_PAYLOADS = {
	PROFILE: {
		email: 'test@n8n.io',
		firstName: 'John',
		lastName: 'Smith',
	},
	PASSWORD: {
		password: 'abcd1234',
	},
	SURVEY: {
		codingSkill: 'a',
		companyIndustry: 'b',
		companySize: 'c',
		otherCompanyIndustry: 'd',
		otherWorkArea: 'e',
		workArea: 'f',
	},
};
