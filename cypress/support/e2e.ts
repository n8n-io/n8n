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

	cy.intercept('GET', '/rest/settings', (req) => {
		// Disable cache
		delete req.headers['if-none-match'];
		req.on('response', (res) => {
			const defaultSettings = res.body.data;
			res.send({ data: merge(cloneDeep(defaultSettings), settings) });
		});
	}).as('loadSettings');

	cy.intercept('GET', '/types/nodes.json').as('loadNodeTypes');

	// Always intercept the request to test credentials and return a success
	cy.intercept('POST', '/rest/credentials/test', {
		data: { status: 'success', message: 'Tested successfully' },
	}).as('credentialTest');

	cy.intercept('POST', '/rest/license/renew', {});

	cy.intercept({ pathname: '/api/health' }, { status: 'OK' }).as('healthCheck');
	cy.intercept({ pathname: '/api/versions/*' }, [
		{
			name: '1.45.1',
			createdAt: '2023-08-18T11:53:12.857Z',
			hasSecurityIssue: null,
			hasSecurityFix: null,
			securityIssueFixVersion: null,
			hasBreakingChange: null,
			documentationUrl: 'https://docs.n8n.io/release-notes/#n8n131',
			nodes: [],
			description: 'Includes <strong>bug fixes</strong>',
		},
		{
			name: '1.0.5',
			createdAt: '2023-07-24T10:54:56.097Z',
			hasSecurityIssue: false,
			hasSecurityFix: null,
			securityIssueFixVersion: null,
			hasBreakingChange: true,
			documentationUrl: 'https://docs.n8n.io/release-notes/#n8n104',
			nodes: [],
			description: 'Includes <strong>core functionality</strong> and <strong>bug fixes</strong>',
		},
	]).as('getVersions');
});
