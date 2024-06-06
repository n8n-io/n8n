import { NDV, WorkflowPage } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('ADO-2230 NDV Pagination Reset', () => {
	it('should reset pagaintion if data size changes to less than current page', () => {
		// setup, load workflow with debughelper node with random seed
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('NDV-debug-generate-data.json', `Debug workflow`);
		workflowPage.actions.openNode('DebugHelper');

		// execute node outputting 10 pages, check output of first page
		ndv.actions.execute();
		workflowPage.getters
			.successToast()
			.find('.el-notification__closeBtn')
			.click({ multiple: true });
		ndv.getters.outputTbodyCell(1, 1).invoke('text').should('eq', 'Terry.Dach@hotmail.com');

		// open 4th page, check output
		ndv.getters.pagination().should('be.visible');
		ndv.getters.pagination().find('li.number').should('have.length', 5);
		ndv.getters.pagination().find('li.number').eq(3).click();
		ndv.getters.outputTbodyCell(1, 1).invoke('text').should('eq', 'Shane.Cormier68@yahoo.com');

		// output a lot less data
		ndv.getters.parameterInput('randomDataCount').find('input').clear().type('20');
		ndv.actions.execute();
		workflowPage.getters
			.successToast()
			.find('.el-notification__closeBtn')
			.click({ multiple: true });

		// check we are back to second page now
		ndv.getters.pagination().find('li.number').should('have.length', 2);
		ndv.getters.outputTbodyCell(1, 1).invoke('text').should('eq', 'Sylvia.Weber@hotmail.com');
	});
});
