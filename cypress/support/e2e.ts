// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';
import CustomNodeFixture from '../fixtures/Custom_node.json';
import CustomNodeWithN8nCredentialFixture from '../fixtures/Custom_node_n8n_credential.json';
import CustomNodeWithCustomCredentialFixture from '../fixtures/Custom_node_custom_credential.json';
import CustomCredential from '../fixtures/Custom_credential.json';

// Load custom nodes and credentials fixtures
beforeEach(() => {
	cy.intercept('GET', '/types/nodes.json', (req) => {
		req.continue((res) => {
			const nodes = res.body;

			res.headers['cache-control'] = 'no-cache, no-store';
			nodes.push(CustomNodeFixture, CustomNodeWithN8nCredentialFixture, CustomNodeWithCustomCredentialFixture);
			res.send(nodes);
		});
	}).as('nodesIntercept');

	cy.intercept('GET', '/types/credentials.json', (req) => {
		req.continue((res) => {
			const credentials = res.body;

			res.headers['cache-control'] = 'no-cache, no-store';
			credentials.push(CustomCredential);
			res.send(credentials);
		});
	}).as('credentialsIntercept');
})
