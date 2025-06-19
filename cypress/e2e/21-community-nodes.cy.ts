import type { ICredentialType } from 'n8n-workflow';

import CustomCredential from '../fixtures/Custom_credential.json';
import CustomNodeFixture from '../fixtures/Custom_node.json';
import CustomNodeWithCustomCredentialFixture from '../fixtures/Custom_node_custom_credential.json';
import CustomNodeWithN8nCredentialFixture from '../fixtures/Custom_node_n8n_credential.json';
import { CredentialsModal, WorkflowPage } from '../pages';
import { NodeCreator } from '../pages/features/node-creator';
import {
	confirmCommunityNodeUninstall,
	confirmCommunityNodeUpdate,
	getCommunityCards,
	installFirstCommunityNode,
	visitCommunityNodesSettings,
} from '../pages/settings-community-nodes';
import { getVisibleSelect } from '../utils';

const credentialsModal = new CredentialsModal();
const nodeCreatorFeature = new NodeCreator();
const workflowPage = new WorkflowPage();
const ADD_TO_WORKFLOW_BUTTON = 'Add to workflow';

const addCommunityNodeToCanvas = (name: string) => {
	nodeCreatorFeature.actions.openNodeCreator();
	nodeCreatorFeature.getters.searchBar().find('input').clear().type(name);

	nodeCreatorFeature.getters.getCreatorItem(name).find('.el-tooltip__trigger').should('exist');
	nodeCreatorFeature.actions.selectNode(name);

	cy.contains('span', name).should('be.visible');
	cy.contains(ADD_TO_WORKFLOW_BUTTON).should('be.visible').click();
};

// We separate-out the custom nodes because they require injecting nodes and credentials
// so the /nodes and /credentials endpoints are intercepted and non-cached.
// We want to keep the other tests as fast as possible so we don't want to break the cache in those.
describe('Community and custom nodes in canvas', () => {
	beforeEach(() => {
		cy.intercept('/types/nodes.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const nodes = res.body || [];

				nodes.push(
					CustomNodeFixture,
					CustomNodeWithN8nCredentialFixture,
					CustomNodeWithCustomCredentialFixture,
				);
			});
		});

		cy.intercept('/types/credentials.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const credentials: ICredentialType[] = res.body || [];

				credentials.push(CustomCredential as ICredentialType);
			});
		});

		// next intercepts are not strictly needed, but they make the tests faster
		// - intercept request to vetted community types, returning empty list
		// - intercept request to vetted community type details, return null
		// - intercept request npm registry, return 404
		// --------------------------------------------------------------------------
		cy.intercept('/community-node-types', (req) => {
			req.reply({
				statusCode: 200,
				body: {
					data: [],
				},
			});
		});

		cy.intercept('GET', '/community-node-types/*', {
			statusCode: 200,
			body: null,
		});

		cy.intercept('GET', 'https://registry.npmjs.org/*', {
			statusCode: 404,
			body: {},
		});
		// --------------------------------------------------------------------------

		workflowPage.actions.visit();
	});

	it('should render and select community node', () => {
		addCommunityNodeToCanvas('E2E Node');

		const nodeParameters = () => cy.getByTestId('node-parameters');
		const firstParameter = () => nodeParameters().find('.parameter-item').eq(0);
		const secondParameter = () => nodeParameters().find('.parameter-item').eq(1);

		// Check correct fields are rendered
		nodeParameters().should('exist');
		// Test property text input
		firstParameter().contains('Test property').should('exist');
		firstParameter().find('input.el-input__inner').should('have.value', 'Some default');
		// Resource select input
		secondParameter().find('label').contains('Resource').should('exist');
		secondParameter().find('input.el-input__inner').should('have.value', 'option2');
		secondParameter().find('.el-select').click();
		// Check if all options are rendered and select the fourth one
		getVisibleSelect().find('li').should('have.length', 4);
		getVisibleSelect().find('li').eq(3).contains('option4').should('exist').click();
		secondParameter().find('input.el-input__inner').should('have.value', 'option4');
	});

	it('should render custom node with n8n credential', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		addCommunityNodeToCanvas('E2E Node with native n8n credential');
		workflowPage.getters.nodeCredentialsLabel().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.editCredentialModal().should('be.visible');
		credentialsModal.getters.editCredentialModal().should('contain.text', 'Notion API');
	});

	it('should render custom node with custom credential', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		addCommunityNodeToCanvas('E2E Node with custom credential');
		workflowPage.getters.nodeCredentialsLabel().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.editCredentialModal().should('be.visible');
		credentialsModal.getters.editCredentialModal().should('contain.text', 'Custom E2E Credential');
	});
});

describe('Community nodes', () => {
	const mockPackage = {
		createdAt: '2024-07-22T19:08:06.505Z',
		updatedAt: '2024-07-22T19:08:06.505Z',
		packageName: 'n8n-nodes-chatwork',
		installedVersion: '1.0.0',
		authorName: null,
		authorEmail: null,
		installedNodes: [
			{
				name: 'Chatwork',
				type: 'n8n-nodes-chatwork.chatwork',
				latestVersion: 1,
			},
		],
		updateAvailable: '1.1.2',
	};

	it('can install, update and uninstall community nodes', () => {
		cy.intercept(
			{
				hostname: 'api.npms.io',
				pathname: '/v2/search',
				query: { q: 'keywords:n8n-community-node-package' },
			},
			{ body: {} },
		);
		cy.intercept(
			{ method: 'GET', pathname: '/rest/community-packages', times: 1 },
			{
				body: { data: [] },
			},
		).as('getEmptyPackages');
		visitCommunityNodesSettings();
		cy.wait('@getEmptyPackages');

		// install a package
		cy.intercept(
			{ method: 'POST', pathname: '/rest/community-packages', times: 1 },
			{
				body: { data: mockPackage },
			},
		).as('installPackage');
		cy.intercept(
			{ method: 'GET', pathname: '/rest/community-packages', times: 1 },
			{
				body: { data: [mockPackage] },
			},
		).as('getPackages');
		installFirstCommunityNode('n8n-nodes-chatwork@1.0.0');
		cy.wait('@installPackage');
		cy.wait('@getPackages');
		getCommunityCards().should('have.length', 1);
		getCommunityCards().eq(0).should('include.text', 'v1.0.0');

		// update the package
		cy.intercept(
			{ method: 'PATCH', pathname: '/rest/community-packages' },
			{
				body: { data: { ...mockPackage, installedVersion: '1.2.0', updateAvailable: undefined } },
			},
		).as('updatePackage');
		getCommunityCards().eq(0).find('button').click();
		confirmCommunityNodeUpdate();
		cy.wait('@updatePackage');
		getCommunityCards().should('have.length', 1);
		getCommunityCards().eq(0).should('not.include.text', 'v1.0.0');

		// uninstall the package
		cy.intercept(
			{
				method: 'DELETE',
				pathname: '/rest/community-packages',
				query: { name: 'n8n-nodes-chatwork' },
			},
			{ statusCode: 204 },
		).as('uninstallPackage');
		getCommunityCards().getByTestId('action-toggle').click();
		cy.getByTestId('action-uninstall').click();
		confirmCommunityNodeUninstall();
		cy.wait('@uninstallPackage');

		cy.getByTestId('action-box').should('exist');
	});
});
