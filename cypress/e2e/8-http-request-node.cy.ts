import { NDV, WorkflowPage } from '../pages';
import { NodeCreator } from '../pages/features/node-creator';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const nodeCreatorFeature = new NodeCreator();
const ndv = new NDV();

describe('HTTP Request node', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should make a request with a URL and receive a response', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('HTTP Request');
		workflowPage.actions.openNode('HTTP Request');
		ndv.actions.typeIntoParameterInput('url', 'https://catfact.ninja/fact');

		ndv.actions.execute();

		ndv.getters.outputPanel().contains('fact');
	});

	it('should not crash when deleting body parameters', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('HTTP Request');
		workflowPage.actions.openNode('HTTP Request');

		// Enable body parameters
		cy.getByTestId('parameter-input-sendBody').click();
		cy.getByTestId('parameter-input-contentType').click();
		getVisibleSelect().find('.option-headline').contains('JSON').click();
		cy.getByTestId('parameter-input-specifyBody').click();
		getVisibleSelect().find('.option-headline').contains('Using Fields Below').click();

		// Add multiple body parameters
		cy.getByTestId('parameter-input-bodyParameters').click();
		cy.getByTestId('parameter-input-bodyParameters').find('.add-parameter').click();
		cy.getByTestId('parameter-input-bodyParameters').find('.add-parameter').click();

		// Fill in the parameters
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Name"]')
			.first()
			.type('param1');
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Value"]')
			.first()
			.type('value1');
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Name"]')
			.eq(1)
			.type('param2');
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Value"]')
			.eq(1)
			.type('value2');

		// Delete the first parameter (this should not crash)
		cy.getByTestId('parameter-input-bodyParameters').find('.delete-parameter').first().click();

		// Verify the parameter was deleted and no crash occurred
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Name"]')
			.should('have.length', 1);
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Name"]')
			.first()
			.should('have.value', 'param2');

		// Delete the remaining parameter
		cy.getByTestId('parameter-input-bodyParameters').find('.delete-parameter').first().click();

		// Verify all parameters are deleted and no crash occurred
		cy.getByTestId('parameter-input-bodyParameters')
			.find('input[placeholder="Name"]')
			.should('have.length', 0);

		// Verify the page is still functional
		ndv.getters.nodeNameContainer().should('be.visible');
	});

	describe('Credential-only HTTP Request Node variants', () => {
		it('should render a modified HTTP Request Node', () => {
			workflowPage.actions.addInitialNodeToCanvas('Manual');

			workflowPage.getters.nodeCreatorPlusButton().click();
			workflowPage.getters.nodeCreatorSearchBar().type('VirusTotal');

			expect(nodeCreatorFeature.getters.nodeItemName().first().should('have.text', 'VirusTotal'));
			expect(
				nodeCreatorFeature.getters
					.nodeItemDescription()
					.first()
					.should('have.text', 'HTTP request'),
			);

			nodeCreatorFeature.actions.selectNode('VirusTotal');
			expect(ndv.getters.nodeNameContainer().should('contain.text', 'VirusTotal HTTP Request'));
			expect(
				ndv.getters
					.parameterInput('url')
					.find('input')
					.should('contain.value', 'https://www.virustotal.com/api/v3/'),
			);

			// These parameters exist for normal HTTP Request Node, but are hidden for credential-only variants
			expect(ndv.getters.parameterInput('authentication').should('not.exist'));
			expect(ndv.getters.parameterInput('nodeCredentialType').should('not.exist'));

			expect(
				workflowPage.getters
					.nodeCredentialsLabel()
					.should('contain.text', 'Credential for VirusTotal'),
			);
		});
	});
});
