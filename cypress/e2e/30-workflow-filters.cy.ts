import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

import { MainSidebar } from '../pages';
import { INSTANCE_OWNER } from '../constants';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPages = new WorkflowPageClass();
const mainSidebar = new MainSidebar();

describe.skip('Workflow filters', () => {
	before(() => {
		cy.enableFeature('sharing', true);
	});

	beforeEach(() => {
		cy.visit(WorkflowsPage.url);
	});

	it('Should filter by tags', () => {
		cy.visit(WorkflowsPage.url);
		WorkflowsPage.getters.newWorkflowButtonCard().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', `Workflow 1`);
		cy.visit(WorkflowsPage.url);
		WorkflowsPage.getters.createWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_2.json', `Workflow 2`);
		cy.visit(WorkflowsPage.url);

		WorkflowsPage.getters.workflowFilterButton().click();
		WorkflowsPage.getters.workflowTagsDropdown().click();
		WorkflowsPage.getters.workflowTagItem('other-tag-1').click();
		cy.get('body').click(0, 0);

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters.workflowCard('Workflow 2').should('contain.text', 'Workflow 2');
		mainSidebar.actions.goToSettings();
		cy.go('back');

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters.workflowCard('Workflow 2').should('contain.text', 'Workflow 2');
		WorkflowsPage.getters.workflowResetFilters().click();

		WorkflowsPage.getters.workflowCards().each(($el) => {
			const workflowName = $el.find('[data-test-id="workflow-card-name"]').text();

			WorkflowsPage.getters.workflowCardActions(workflowName).click();
			WorkflowsPage.getters.workflowDeleteButton().click();

			cy.get('button').contains('delete').click();
		});
	});

	it('Should filter by status', () => {
		cy.visit(WorkflowsPage.url);
		WorkflowsPage.getters.newWorkflowButtonCard().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', `Workflow 1`);
		cy.visit(WorkflowsPage.url);
		WorkflowsPage.getters.createWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_3.json', `Workflow 3`);
		WorkflowPages.getters.activatorSwitch().click();
		cy.visit(WorkflowsPage.url);

		WorkflowsPage.getters.workflowFilterButton().click();
		WorkflowsPage.getters.workflowStatusDropdown().click();
		WorkflowsPage.getters.workflowStatusItem('Active').click();
		cy.get('body').click(0, 0);

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters.workflowCard('Workflow 3').should('contain.text', 'Workflow 3');
		mainSidebar.actions.goToSettings();
		cy.go('back');

		WorkflowsPage.getters.workflowCards().should('have.length', 1);
		WorkflowsPage.getters.workflowCard('Workflow 3').should('contain.text', 'Workflow 3');
		WorkflowsPage.getters.workflowResetFilters().click();

		WorkflowsPage.getters.workflowCards().each(($el) => {
			const workflowName = $el.find('[data-test-id="workflow-card-name"]').text();

			WorkflowsPage.getters.workflowCardActions(workflowName).click();
			WorkflowsPage.getters.workflowDeleteButton().click();

			cy.get('button').contains('delete').click();
		});
	});

	it('Should filter by owned by', () => {
		cy.visit(WorkflowsPage.url);

		WorkflowsPage.getters.newWorkflowButtonCard().click();
		cy.createFixtureWorkflow('Test_workflow_1.json', `Workflow 1`);
		cy.visit(WorkflowsPage.url);
		WorkflowsPage.getters.createWorkflowButton().click();
		cy.createFixtureWorkflow('Test_workflow_3.json', `Workflow 3`);
		WorkflowPages.getters.activatorSwitch().click();
		cy.visit(WorkflowsPage.url);

		WorkflowsPage.getters.workflowFilterButton().click();
		WorkflowsPage.getters.workflowOwnershipDropdown().realClick();
		WorkflowsPage.getters.workflowOwner(INSTANCE_OWNER.email).click();
		cy.get('body').click(0, 0);

		WorkflowsPage.getters.workflowCards().should('have.length', 2);
		mainSidebar.actions.goToSettings();
		cy.go('back');

		WorkflowsPage.getters.workflowResetFilters().click();

		WorkflowsPage.getters.workflowCards().each(($el) => {
			const workflowName = $el.find('[data-test-id="workflow-card-name"]').text();

			WorkflowsPage.getters.workflowCardActions(workflowName).click();
			WorkflowsPage.getters.workflowDeleteButton().click();

			cy.get('button').contains('delete').click();
		});
	});
});
