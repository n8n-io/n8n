import { NodeCreator } from '../pages/features/node-creator';
import CustomNodeFixture from '../fixtures/Custom_node.json';
import { CredentialsModal, WorkflowPage } from '../pages';
import CustomNodeWithN8nCredentialFixture from '../fixtures/Custom_node_n8n_credential.json';
import CustomNodeWithCustomCredentialFixture from '../fixtures/Custom_node_custom_credential.json';
import CustomCredential from '../fixtures/Custom_credential.json';

const credentialsModal = new CredentialsModal();
const nodeCreatorFeature = new NodeCreator();
const workflowPage = new WorkflowPage();

// We separate-out the custom nodes because they require injecting nodes and credentials
// so the /nodes and /credentials endpoints are intercepted and non-cached.
// We want to keep the other tests as fast as possible so we don't want to break the cache in those.
describe('Community Nodes', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	})
	beforeEach(() => {
		cy.intercept('/types/nodes.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const nodes = res.body || [];

				nodes.push(CustomNodeFixture, CustomNodeWithN8nCredentialFixture, CustomNodeWithCustomCredentialFixture);
			});
		})

		cy.intercept('/types/credentials.json', { middleware: true }, (req) => {
			req.headers['cache-control'] = 'no-cache, no-store';

			req.on('response', (res) => {
				const credentials = res.body || [];

				credentials.push(CustomCredential);
			})
		})
		workflowPage.actions.visit();
	});

	it('should render and select community node', () => {
		const customNode = 'E2E Node';

		nodeCreatorFeature.actions.openNodeCreator();
		nodeCreatorFeature.getters.searchBar().find('input').clear().type(customNode);

		nodeCreatorFeature.getters
			.getCreatorItem(customNode)
			.findChildByTestId('node-creator-item-tooltip')
			.should('exist');
		nodeCreatorFeature.actions.selectNode(customNode);

		// TODO: Replace once we have canvas feature utils
		cy.get('.data-display .node-name').contains(customNode).should('exist');

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
		secondParameter().find('.el-select-dropdown__list').should('exist');
		// Check if all options are rendered and select the fourth one
		secondParameter().find('.el-select-dropdown__list').children().should('have.length', 4);
		secondParameter()
			.find('.el-select-dropdown__list')
			.children()
			.eq(3)
			.contains('option4')
			.should('exist')
			.click();
		secondParameter().find('input.el-input__inner').should('have.value', 'option4');
	});

	it('should render custom node with n8n credential', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('E2E Node with native n8n credential', true, true);
		workflowPage.getters.nodeCredentialsLabel().click();
		cy.contains('Create New Credential').click();
		credentialsModal.getters.editCredentialModal().should('be.visible');
		credentialsModal.getters.editCredentialModal().should('contain.text', 'Notion API');
	});

	it('should render custom node with custom credential', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('E2E Node with custom credential', true, true);
		workflowPage.getters.nodeCredentialsLabel().click();
		cy.contains('Create New Credential').click();
		credentialsModal.getters.editCredentialModal().should('be.visible');
		credentialsModal.getters.editCredentialModal().should('contain.text', 'Custom E2E Credential');
	});
});
