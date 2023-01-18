import { WorkflowPage, NDV, CanvasNode } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const canvasNode = new CanvasNode();

describe('Data pinning', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('Should be able to map expressions', () => {
		cy.fixture('Test_workflow-actions_paste-data.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		canvasNode.actions.openNode('Set');
		ndv.actions.executePrevious();
		ndv.getters.inputDataContainer().get('table').should('be.visible');

		ndv.getters.nodeParameters().find('input').click();
	});
});
