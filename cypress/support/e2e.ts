import { BASE_URL, INSTANCE_MEMBERS, INSTANCE_OWNER } from '../constants';
import './commands';

before(() => {
	cy.request('POST', `${BASE_URL}/rest/e2e/reset`, {
		owner: INSTANCE_OWNER,
		members: INSTANCE_MEMBERS,
	});
});

beforeEach(() => {
	if (!cy.config('disableAutoLogin')) {
		cy.signin({ email: INSTANCE_OWNER.email, password: INSTANCE_OWNER.password });
	}

	cy.intercept('GET', '/rest/settings').as('loadSettings');

	// Always intercept the request to test credentials and return a success
	cy.intercept('POST', '/rest/credentials/test', {
		statusCode: 200,
		body: {
			data: { status: 'success', message: 'Tested successfully' },
		},
	});
});
