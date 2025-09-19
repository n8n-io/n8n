import type { RouteHandler } from 'cypress/types/net-stubbing';

import executionOutOfMemoryServerResponse from '../fixtures/responses/execution-out-of-memory-server-response.json';
import { WorkflowPage } from '../pages';
import { WorkflowExecutionsTab } from '../pages/workflow-executions-tab';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const executionsTab = new WorkflowExecutionsTab();
const executionsRefreshInterval = 4000;

// Test suite for executions tab
describe('Workflow Executions', () => {
	describe('when workflow is saved', () => {
		beforeEach(() => {
			workflowPage.actions.visit();
			cy.createFixtureWorkflow('Test_workflow_4_executions_view.json');
		});

		it('should render executions tab correctly', () => {
			createMockExecutions();
			cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');

			executionsTab.actions.switchToExecutionsTab();

			cy.wait(['@getExecutions']);

			executionsTab.getters.executionsList().scrollTo(0, 500).wait(0);

			executionsTab.getters.executionListItems().should('have.length', 30);
			executionsTab.getters.successfulExecutionListItems().should('have.length', 28);
			executionsTab.getters.failedExecutionListItems().should('have.length', 2);
			executionsTab.getters
				.executionListItems()
				.first()
				.invoke('attr', 'class')
				.should('match', /_active_/);
		});

		it('should not redirect back to execution tab when request is not done before leaving the page', () => {
			cy.intercept('GET', '/rest/executions?filter=*');
			cy.intercept('GET', '/rest/executions/active?filter=*');

			executionsTab.actions.switchToExecutionsTab();
			executionsTab.actions.switchToEditorTab();
			cy.wait(executionsRefreshInterval);
			cy.url().should('not.include', '/executions');
			executionsTab.actions.switchToExecutionsTab();
			executionsTab.actions.switchToEditorTab();
			executionsTab.actions.switchToExecutionsTab();
			executionsTab.actions.switchToEditorTab();
			executionsTab.actions.switchToExecutionsTab();
			executionsTab.actions.switchToEditorTab();
			cy.wait(executionsRefreshInterval);
			cy.url().should('not.include', '/executions');
			executionsTab.actions.switchToExecutionsTab();
			cy.wait(1000);
			executionsTab.actions.switchToEditorTab();
			cy.wait(executionsRefreshInterval);
			cy.url().should('not.include', '/executions');
		});

		it('should not redirect back to execution tab when slow request is not done before leaving the page', () => {
			const throttleResponse: RouteHandler = async (req) => {
				return await new Promise((resolve) => {
					setTimeout(() => resolve(req.continue()), 2000);
				});
			};

			cy.intercept('GET', '/rest/executions?filter=*', throttleResponse);
			cy.intercept('GET', '/rest/executions/active?filter=*', throttleResponse);

			executionsTab.actions.switchToExecutionsTab();
			executionsTab.actions.switchToEditorTab();
			cy.wait(executionsRefreshInterval);
			cy.url().should('not.include', '/executions');
		});

		it('should error toast when server error message returned without stack trace', () => {
			executionsTab.actions.createManualExecutions(1);
			const message = 'Workflow did not finish, possible out-of-memory issue';
			cy.intercept('GET', '/rest/executions/*', {
				statusCode: 200,
				body: executionOutOfMemoryServerResponse,
			}).as('getExecution');

			executionsTab.actions.switchToExecutionsTab();
			cy.wait(['@getExecution']);

			executionsTab.getters
				.workflowExecutionPreviewIframe()
				.should('be.visible')
				.its('0.contentDocument.body') // Access the body of the iframe document
				.should('not.be.empty') // Ensure the body is not empty

				.then(cy.wrap)
				.find('.el-notification:has(.el-notification--error)')
				.should('be.visible')
				.filter(`:contains("${message}")`)
				.should('be.visible');
		});

		it('should show workflow data in executions tab after hard reload and modify name and tags', () => {
			executionsTab.actions.switchToExecutionsTab();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 2);

			workflowPage.getters.workflowTags().click();
			getVisibleSelect().find('li:contains("Manage tags")').click();
			cy.get('button:contains("Add new")').click();
			cy.getByTestId('tags-table').find('input').type('nutag').type('{enter}');
			cy.get('button:contains("Done")').click();

			cy.reload();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.workflowTags().click();
			workflowPage.getters.tagsInDropdown().first().should('have.text', 'nutag').click();
			workflowPage.getters.tagPills().should('have.length', 3);

			let newWorkflowName = 'Renamed workflow';
			workflowPage.actions.renameWorkflow(newWorkflowName);
			workflowPage.getters.isWorkflowSaved();
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);

			executionsTab.actions.switchToEditorTab();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 3);
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);

			executionsTab.actions.switchToExecutionsTab();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 3);
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);

			executionsTab.actions.switchToEditorTab();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 3);
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);

			newWorkflowName = 'New workflow';
			workflowPage.actions.renameWorkflow(newWorkflowName);
			workflowPage.getters.isWorkflowSaved();
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);
			workflowPage.getters.workflowTags().click();
			workflowPage.getters.tagsDropdown().find('.el-tag__close').first().click();
			cy.get('body').click(0, 0);
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 2);

			executionsTab.actions.switchToExecutionsTab();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 2);
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);

			executionsTab.actions.switchToEditorTab();
			checkMainHeaderELements();
			workflowPage.getters.saveButton().find('button').should('not.exist');
			workflowPage.getters.tagPills().should('have.length', 2);
			workflowPage.getters
				.workflowNameInputContainer()
				.invoke('attr', 'title')
				.should('eq', newWorkflowName);
		});
		// This should be a component test. Abstracting this away into to ensure our lists work.
		// eslint-disable-next-line n8n-local-rules/no-skipped-tests
		it.skip('should load items and auto scroll after filter change', () => {
			createMockExecutions();
			createMockExecutions();
			cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');

			executionsTab.actions.switchToExecutionsTab();

			cy.wait(['@getExecutions']);

			executionsTab.getters.executionsList().scrollTo(0, 500).wait(0);

			executionsTab.getters.executionListItems().eq(10).click();

			cy.getByTestId('executions-filter-button').click();
			cy.getByTestId('executions-filter-status-select').should('be.visible').click();
			getVisibleSelect().find('li:contains("Error")').click();

			executionsTab.getters.executionListItems().should('have.length', 5);
			executionsTab.getters.successfulExecutionListItems().should('have.length', 1);
			executionsTab.getters.failedExecutionListItems().should('have.length', 4);

			cy.getByTestId('executions-filter-button').click();
			cy.getByTestId('executions-filter-status-select').should('be.visible').click();
			getVisibleSelect().find('li:contains("Success")').click();

			// check if the list is scrolled
			executionsTab.getters.executionListItems().eq(10).should('be.visible');
			executionsTab.getters.executionsList().then(($el) => {
				const { scrollTop, scrollHeight, clientHeight } = $el[0];
				expect(scrollTop).to.be.greaterThan(0);
				expect(scrollTop + clientHeight).to.be.lessThan(scrollHeight);

				// scroll to the bottom
				$el[0].scrollTo(0, scrollHeight);
				executionsTab.getters.executionListItems().should('have.length', 18);
				executionsTab.getters.successfulExecutionListItems().should('have.length', 18);
				executionsTab.getters.failedExecutionListItems().should('have.length', 0);
			});

			cy.getByTestId('executions-filter-button').click();
			cy.getByTestId('executions-filter-reset-button').should('be.visible').click();
			executionsTab.getters.executionListItems().eq(11).should('be.visible');
		});

		it('should redirect back to editor after seeing a couple of execution using browser back button', () => {
			createMockExecutions();
			cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');

			executionsTab.actions.switchToExecutionsTab();

			cy.wait(['@getExecutions']);
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');

			executionsTab.getters.executionListItems().eq(2).click();
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');
			executionsTab.getters.executionListItems().eq(4).click();
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');
			executionsTab.getters.executionListItems().eq(6).click();
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');

			cy.go('back');
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');
			cy.go('back');
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');
			cy.go('back');
			executionsTab.getters.workflowExecutionPreviewIframe().should('exist');
			cy.go('back');

			cy.url().should('not.include', '/executions');
			cy.url().should('include', '/workflow/');
			workflowPage.getters.nodeViewRoot().should('be.visible');
		});
	});

	describe('when new workflow is not saved', () => {
		beforeEach(() => {
			workflowPage.actions.visit();
		});

		it('should open executions tab', () => {
			executionsTab.actions.switchToExecutionsTab();
			executionsTab.getters.executionsSidebar().should('be.visible');
			executionsTab.getters.executionsEmptyList().should('be.visible');
			cy.getByTestId('workflow-execution-no-trigger-content').should('be.visible');
			cy.get('button:contains("Add first step")').should('be.visible').click();

			cy.getByTestId('node-creator-item-name')
				.should('be.visible')
				.filter(':contains("Trigger manually")')
				.click();
			executionsTab.actions.switchToExecutionsTab();
			executionsTab.getters.executionsSidebar().should('be.visible');
			executionsTab.getters.executionsEmptyList().should('be.visible');
			cy.getByTestId('workflow-execution-no-content').should('be.visible');

			workflowPage.getters.saveButton().find('button').should('be.enabled').click();
			workflowPage.getters.isWorkflowSaved();
			workflowPage.getters.nodeViewRoot().should('be.visible');
		});
	});
});

const createMockExecutions = () => {
	executionsTab.actions.createManualExecutions(15);
	// This wait is added to allow time for the notifications to expire
	cy.wait(2000);
	// Make some failed executions by enabling Code node with syntax error
	executionsTab.actions.toggleNodeEnabled('Error');
	workflowPage.getters.disabledNodes().should('have.length', 0);
	executionsTab.actions.createManualExecutions(2);
	// This wait is added to allow time for the notifications to expire
	cy.wait(2000);

	// Then add some more successful ones
	executionsTab.actions.toggleNodeEnabled('Error');
	workflowPage.getters.disabledNodes().should('have.length', 1);
	executionsTab.actions.createManualExecutions(15);
};

const checkMainHeaderELements = () => {
	workflowPage.getters.workflowNameInputContainer().should('be.visible');
	workflowPage.getters.workflowTagsContainer().should('be.visible');
	workflowPage.getters.workflowMenu().should('be.visible');
	workflowPage.getters.saveButton().should('be.visible');
};
