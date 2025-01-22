import { WorkflowPage, NDV } from '../pages';
import { NodeCreator } from '../pages/features/node-creator';

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
