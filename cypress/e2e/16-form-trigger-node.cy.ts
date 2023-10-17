import { WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';
import { getPopper, getVisiblePopper, getVisibleSelect } from '../utils';
import { META_KEY } from '../constants';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('n8n Form Trigger', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it("add node by clicking on 'On form submission'", () => {
		workflowPage.getters.canvasPlusButton().click();
		cy.get('#node-view-root > div:nth-child(2) > div > div > aside ')
			.find('span')
			.contains('On form submission')
			.click();
		ndv.getters.parameterInput('formTitle').type('Test Form');
		ndv.getters.parameterInput('formDescription').type('Test Form Description');
		ndv.getters.parameterInput('fieldLabel').type('Test Field 1');
		ndv.getters.backToCanvas().click();
		workflowPage.getters.nodeIssuesByName('n8n Form Trigger').should('not.exist');
	});

	it('should fill up form fields', () => {
		workflowPage.actions.addInitialNodeToCanvas('n8n Form Trigger');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.parameterInput('formTitle').type('Test Form');
		ndv.getters.parameterInput('formDescription').type('Test Form Description');
		//fill up first field of type number
		ndv.getters.parameterInput('fieldLabel').type('Test Field 1');
		ndv.getters.parameterInput('fieldType').click();
		getVisibleSelect().contains('Number').click();
		cy.get(
			'[data-test-id="parameter-input-requiredField"] > .parameter-input > .el-switch > .el-switch__core',
		).click();
		//fill up second field of type text
		cy.get('.fixed-collection-parameter > :nth-child(2) > .button > span').click();
		cy.get('.border-top-dashed > .parameter-input-list-wrapper > :nth-child(1) > .parameter-item')
			.find('input[placeholder*="e.g. What is your name?"]')
			.type('Test Field 2');
		//fill up second field of type date
		cy.get('.fixed-collection-parameter > :nth-child(2) > .button > span').click();
		cy.get(
			':nth-child(3) > .border-top-dashed > .parameter-input-list-wrapper > :nth-child(1) > .parameter-item',
		)
			.find('input[placeholder*="e.g. What is your name?"]')
			.type('Test Field 3');
		cy.get(
			':nth-child(3) > .border-top-dashed > .parameter-input-list-wrapper > :nth-child(2) > .parameter-item',
		).click();
		getVisibleSelect().contains('Date').click();
		// fill up second field of type dropdown
		cy.get('.fixed-collection-parameter > :nth-child(2) > .button').click();
		cy.get(
			':nth-child(4) > .border-top-dashed > .parameter-input-list-wrapper > :nth-child(1) > .parameter-item',
		)
			.find('input[placeholder*="e.g. What is your name?"]')
			.type('Test Field 4');
		cy.get(
			':nth-child(4) > .border-top-dashed > .parameter-input-list-wrapper > :nth-child(2) > .parameter-item',
		).click();
		getVisibleSelect().contains('Dropdown').click();
		cy.get(
			'.border-top-dashed > :nth-child(2) > :nth-child(3) > .multi-parameter > .fixed-collection-parameter > :nth-child(2) > .button',
		).click();
		cy.get(
			':nth-child(4) > :nth-child(1) > :nth-child(2) > :nth-child(3) > .multi-parameter > .fixed-collection-parameter > .fixed-collection-parameter-property > :nth-child(1) > :nth-child(1)',
		)
			.find('input')
			.type('Option 1');
		cy.get(
			':nth-child(4) > :nth-child(1) > :nth-child(2) > :nth-child(3) > .multi-parameter > .fixed-collection-parameter > .fixed-collection-parameter-property > :nth-child(1) > :nth-child(2)',
		)
			.find('input')
			.type('Option 2');
		//add optionall submitted message
		cy.get('.param-options > .button').click();
		cy.get('.indent > .parameter-item')
			.find('input')
			.clear()
			.type('Your test form was successfully submitted');
		ndv.getters.backToCanvas().click();
		workflowPage.getters.nodeIssuesByName('n8n Form Trigger').should('not.exist');
	});
});
