import { WorkflowPage, WorkflowsPage, NDV } from '../pages';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Schedule Trigger node', async () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	it('should execute and return the execution timestamp', () => {
		cy.visit(workflowsPage.url);

		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.renameWorkflow('Schedule Trigger Workflow');
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.openNode('Schedule Trigger');

		cy.getByTestId('parameter-input-field').click();
		cy.getByTestId('parameter-input-field')
			.find('.el-select-dropdown')
			.find('.option-headline')
			.contains('Seconds')
			.click();

		cy.getByTestId('parameter-input-secondsInterval').clear().type('2');

		ndv.actions.execute();
		ndv.getters.outputPanel().contains('timestamp');

		ndv.getters.backToCanvas().click();
		workflowPage.actions.saveWorkflowOnButtonClick();
		workflowPage.actions.activateWorkflow();

		cy.request("GET", '/rest/workflows').then((response) => {
			expect(response.status).to.eq(200);
			console.log(response.body);
			expect(response.body.data).to.have.length(1);
			const workflowId = response.body.data[0].id.toString();
			console.log("workflowId: " + workflowId);
			expect(workflowId).to.not.be.empty;
			return workflowId;
		}).then((workflowId) => {
			cy.wait(2500);
			cy.request("GET", '/rest/executions').then((response) => {
				expect(response.status).to.eq(200);
				console.log(response.body);
				expect(response.body.data.results).to.have.length(1);
				const executionData = response.body.data.results[0];
				console.log("workflowId: " + workflowId);
				console.log(executionData);
				expect(executionData.workflowId).to.eq(workflowId);
			});
		});

	});
});
