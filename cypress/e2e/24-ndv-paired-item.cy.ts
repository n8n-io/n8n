import { WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();

	});
	beforeEach(() => {
		workflowPage.actions.visit();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('maps paired input and output items', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();

		workflowPage.actions.executeWorkflow();

		workflowPage.actions.openNode('Item Lists');

		ndv.getters.inputPanel().contains('6 items').should('exist');
		ndv.getters.outputPanel().contains('6 items').should('exist');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		// input to output
		ndv.getters.inputTableRow(1)
			.should('exist')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.inputTableRow(1)
			.realHover();
		ndv.getters.outputTableRow(4)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.inputTableRow(2)
			.realHover();
		ndv.getters.outputTableRow(2)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		
		ndv.getters.inputTableRow(3)
			.realHover();
		ndv.getters.outputTableRow(6)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		// output to input
		ndv.getters.outputTableRow(1)
			.realHover();
		ndv.getters.inputTableRow(4)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

			ndv.getters.outputTableRow(4)
			.realHover();
		ndv.getters.inputTableRow(1)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(2)
			.realHover();
		ndv.getters.inputTableRow(2)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		
		ndv.getters.outputTableRow(6)
			.realHover();
		ndv.getters.inputTableRow(3)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(1)
			.realHover();
		ndv.getters.inputTableRow(4)
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
	});

	it('maps paired input and output items based on selected input node', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set2');

		ndv.getters.inputPanel().contains('6 items').should('exist');
		ndv.getters.outputRunSelector()
			.should('exist')
			.should('include.text', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.getters.backToCanvas().realHover(); // reset to default hover
		ndv.getters.outputHoveringItem().should('not.exist');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1111');

		ndv.actions.selectInputNode('Set1');
		ndv.getters.backToCanvas().realHover(); // reset to default hover

		ndv.getters.inputTableRow(1)
			.should('have.text', '1000')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		ndv.getters.inputTableRow(1).realHover();
		cy.wait(50);
		ndv.getters.outputHoveringItem().should('have.text', '1000');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');

		ndv.actions.selectInputNode('Item Lists');
		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.backToCanvas().realHover(); // reset to default hover

		ndv.getters.inputTableRow(1)
			.should('have.text', '1111')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		ndv.getters.inputTableRow(1).realHover();
		cy.wait(50);
		ndv.getters.outputHoveringItem().should('have.text', '1111');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1111');
	});

	it('maps paired input and output items based on selected run', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set3');

		ndv.getters.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');
		ndv.getters.outputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputRunSelector().find('input')
			.should('include.value', '1 of 2 (6 items)');
		ndv.getters.outputRunSelector().find('input')
			.should('include.value', '1 of 2 (6 items)');

		ndv.getters.inputTableRow(1)
			.should('have.text', '1111')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		ndv.getters.outputTableRow(1)
			.should('have.text', '1111')
			.realHover();

		ndv.getters.outputTableRow(3)
			.should('have.text', '4444')
			.realHover();
		ndv.getters.inputTableRow(3)
			.should('have.text', '4444')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.actions.changeOutputRunSelector('2 of 2 (6 items)');
		cy.wait(50);

		ndv.getters.inputTableRow(1)
			.should('have.text', '1000')
			.realHover();
		ndv.getters.outputTableRow(1)
			.should('have.text', '1000')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(3)
			.should('have.text', '2000')
			.realHover();
		ndv.getters.inputTableRow(3)
			.should('have.text', '2000')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
	});

	it('resolves expression with default item when input node is not parent, while still pairing items', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set2');

		ndv.getters.inputPanel().contains('6 items').should('exist');
		ndv.getters.outputRunSelector()
			.should('exist')
			.should('include.text', '2 of 2 (6 items)');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.getters.backToCanvas().realHover(); // reset to default hover
		ndv.getters.inputTableRow(1)
			.should('have.text', '1111')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		ndv.getters.inputTableRow(1).realHover();
		ndv.getters.outputHoveringItem().should('not.exist');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1111');

		ndv.actions.selectInputNode('Code1');
		ndv.getters.inputTableRow(1).realHover();
		ndv.getters.inputTableRow(1)
			.should('have.text', '1000')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');
		ndv.getters.outputTableRow(1)
			.should('have.text', '1000');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');

		ndv.actions.selectInputNode('Code');

		ndv.getters.inputTableRow(1).realHover();
		ndv.getters.inputTableRow(1)
		.should('have.text', '6666')
		.invoke('attr', 'data-test-id')
		.should('equal', 'hovering-item');
		ndv.getters.outputHoveringItem().should('not.exist');
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');

		ndv.actions.selectInputNode('When clicking');

		ndv.getters.inputTableRow(1).realHover();
		ndv.getters.inputTableRow(1).should('have.text', "This is an item, but it's empty.").realHover();
		ndv.getters.outputHoveringItem().should('have.length', 6);
		ndv.getters.parameterExpressionPreview('value').should('include.text', '1000');
	});

	it('can pair items between input and output across branches and runs', () => {
		cy.fixture('Test_workflow_5.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('IF');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		ndv.actions.switchOutputBranch('False Branch (2 items)');
		ndv.getters.outputTableRow(1)
			.should('have.text', '8888')
			.realHover();
		ndv.getters.inputTableRow(5)
			.should('have.text', '8888')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.getters.outputTableRow(2)
			.should('have.text', '9999')
			.realHover();
		ndv.getters.inputTableRow(6)
			.should('have.text', '9999')
			.invoke('attr', 'data-test-id')
			.should('equal', 'hovering-item');

		ndv.actions.close();
		workflowPage.actions.openNode('Set5');
		ndv.getters.outputTableRow(1)
			.should('have.text', '8888')
			.realHover();
		ndv.getters.inputHoveringItem().should('not.exist');

		ndv.getters.inputTableRow(1)
			.should('have.text', '1111')
			.realHover();
		ndv.getters.outputHoveringItem().should('not.exist');

		ndv.actions.switchIntputBranch('False Branch');
		ndv.getters.inputTableRow(1)
			.should('have.text', '8888')
			.realHover();
		ndv.getters.outputHoveringItem().should('have.text', '8888');

		ndv.actions.changeOutputRunSelector('1 of 2 (4 items)')
		ndv.getters.outputTableRow(1)
			.should('have.text', '1111')
			.realHover();
		// todo there's a bug here need to fix ADO-534
		// ndv.getters.outputHoveringItem().should('not.exist');
	});
});
