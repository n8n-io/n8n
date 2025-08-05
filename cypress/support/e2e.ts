import registerCypressGrep from '@cypress/grep/src/support';
import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';

import { settings } from './commands';

registerCypressGrep();

before(() => {
	cy.resetDatabase();

	Cypress.on('uncaught:exception', (error) => {
		return !error.message.includes('ResizeObserver');
	});

	// Mock the clipboard API because in newer versions of cypress the clipboard API is flaky when the window is not focussed.
	Cypress.on('window:before:load', (win) => {
		let currentContent: string = '';
		Object.assign(win.navigator.clipboard, {
			writeText: async (text: string) => {
				currentContent = text;
				return await Promise.resolve();
			},
			readText: async () => await Promise.resolve(currentContent),
		});
	});
});

beforeEach(() => {
	cy.window().then((win): void => {
		win.localStorage.setItem('N8N_THEME', 'light');
		win.localStorage.setItem('N8N_AUTOCOMPLETE_ONBOARDED', 'true');
		win.localStorage.setItem('N8N_MAPPING_ONBOARDED', 'true');
	});

	// #region ===== Intercepts =====

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

	cy.intercept('POST', '/rest/license/renew', {
		data: {
			usage: {
				activeWorkflowTriggers: {
					limit: -1,
					value: 0,
					warningThreshold: 0.8,
				},
			},
			license: {
				planId: '',
				planName: 'Community',
			},
		},
	});

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
	cy.intercept(
		{ pathname: '/api/whats-new' },
		{
			id: 1,
			title: "What's new",
			calloutText: '',
			footer: '',
			createdAt: '2025-06-27T14:55:58.717Z',
			updatedAt: '2025-06-27T15:06:44.092Z',
			items: [],
		},
	).as('getWhatsNew');

	// #endregion ===== Intercepts =====

	if (!cy.config('disableAutoLogin')) {
		cy.signinAsOwner();
	}
});
