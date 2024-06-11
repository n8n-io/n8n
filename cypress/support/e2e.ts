import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';
import { settings } from './commands';

before(() => {
	cy.resetDatabase();

	Cypress.on('uncaught:exception', (error) => {
		return !error.message.includes('ResizeObserver');
	});
});

beforeEach(() => {
	if (!cy.config('disableAutoLogin')) {
		cy.signinAsOwner();
	}

	cy.window().then((win): void => {
		win.localStorage.setItem('N8N_THEME', 'light');
	});

	cy.intercept('GET', '/rest/settings', (req) =>
		req.on('response', (res) => {
			const defaultSettings = res.body.data;
			res.send({ data: merge(cloneDeep(defaultSettings), settings) });
		}),
	).as('loadSettings');
	cy.intercept('GET', '/types/nodes.json').as('loadNodeTypes');

	// Always intercept the request to test credentials and return a success
	cy.intercept('POST', '/rest/credentials/test', {
		statusCode: 200,
		body: {
			data: { status: 'success', message: 'Tested successfully' },
		},
	});
});
