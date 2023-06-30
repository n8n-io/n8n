import { WorkflowPage, WorkflowsPage, NDV } from '../pages';
import { BACKEND_BASE_URL } from '../constants';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Schedule Trigger node', async () => {
	before(() => {
		cy.skipSetup();
	});

	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should execute and return the execution timestamp', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.openNode('Schedule Trigger');
		ndv.actions.execute();
		ndv.getters.outputPanel().contains('timestamp');
		ndv.getters.backToCanvas().click();
	});

	it('should execute once per second when activated', () => {
		workflowPage.actions.renameWorkflow('Schedule Trigger Workflow');
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.openNode('Schedule Trigger');

		cy.getByTestId('parameter-input-field').click();
		cy.getByTestId('parameter-input-field')
			.find('.el-select-dropdown')
			.find('.option-headline')
			.contains('Seconds')
			.click();
		cy.getByTestId('parameter-input-secondsInterval').clear().type('1');

		ndv.getters.backToCanvas().click();
		workflowPage.actions.saveWorkflowOnButtonClick();
		workflowPage.actions.activateWorkflow();
		workflowPage.getters.activatorSwitch().should('have.class', 'is-checked');

		cy.url().then((url) => {
			const workflowId = url.split('/').pop();

			cy.wait(1200);
			cy.request('GET', `${BACKEND_BASE_URL}/rest/executions`).then((response) => {
				expect(response.status).to.eq(200);
				expect(workflowId).to.not.be.undefined;
				expect(response.body.data.results.length).to.be.greaterThan(0);
				const matchingExecutions = response.body.data.results.filter(
					(execution: any) => execution.workflowId === workflowId,
				);
				expect(matchingExecutions).to.have.length(1);

				cy.wait(1200);
				cy.request('GET', `${BACKEND_BASE_URL}/rest/executions`).then((response) => {
					expect(response.status).to.eq(200);
					expect(response.body.data.results.length).to.be.greaterThan(0);
					const matchingExecutions = response.body.data.results.filter(
						(execution: any) => execution.workflowId === workflowId,
					);
					expect(matchingExecutions).to.have.length(2);

					workflowPage.actions.activateWorkflow();
					workflowPage.getters.activatorSwitch().should('not.have.class', 'is-checked');
					cy.visit(workflowsPage.url);
					workflowsPage.actions.deleteWorkFlow('Schedule Trigger Workflow');
				});
			});
		});
	});
});
