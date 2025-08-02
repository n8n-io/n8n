import { WorkflowPage, NDV } from '../pages';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('n8n Form Trigger', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it("add node by clicking on 'On form submission'", () => {
		workflowPage.getters.canvasPlusButton().click();
		workflowPage.getters.nodeCreatorNodeItems().contains('On form submission').click();
		ndv.getters.parameterInput('formTitle').type('Test Form');
		ndv.getters.parameterInput('formDescription').type('Test Form Description');
		ndv.getters.backToCanvas().click();
		workflowPage.getters.nodeIssuesByName('On form submission').should('not.exist');
	});

	it('should fill up form fields', () => {
		workflowPage.actions.addInitialNodeToCanvas('n8n Form Trigger', {
			isTrigger: true,
			action: 'On new n8n Form event',
		});
		ndv.getters.parameterInput('formTitle').type('Test Form');
		ndv.getters.parameterInput('formDescription').type('Test Form Description');
		cy.get('[data-test-id="fixed-collection-add"]').click();
		ndv.getters.parameterInput('fieldLabel').type('Test Field 1');
		ndv.getters.parameterInput('fieldType').click();
		//fill up first field of type number
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
		cy.contains('button', 'Add Field Option').click();
		cy.contains('label', 'Field Options')
			.parent()
			.parent()
			.nextAll()
			.find('[data-test-id="parameter-input-field"]')
			.eq(0)
			.type('Option 1');
		cy.contains('label', 'Field Options')
			.parent()
			.parent()
			.nextAll()
			.find('[data-test-id="parameter-input-field"]')
			.eq(1)
			.type('Option 2');

		//add optional submitted message
		cy.get('.param-options').click();
		getVisibleSelect().find('span').contains('Form Response').click();
		cy.contains('span', 'Text to Show')
			.should('exist')
			.parent()
			.parent()
			.next()
			.children()
			.children()
			.children()
			.children()
			.children()
			.children()
			.children()
			.first()
			.type('Your test form was successfully submitted');

		ndv.getters.backToCanvas().click();
		workflowPage.getters.nodeIssuesByName('On form submission').should('not.exist');
	});
});
