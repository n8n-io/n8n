import { NDV, WorkflowPage } from '../../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('ADO-2362 ADO-2350 NDV Prevent clipping long parameters and scrolling to expression', () => {
	it('should show last parameters and open at scroll top of parameters', () => {
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Test-workflow-with-long-parameters.json');
		workflowPage.actions.openNode('Schedule Trigger');

		ndv.getters.inlineExpressionEditorInput().should('be.visible');

		ndv.actions.close();

		workflowPage.actions.openNode('Edit Fields1');

		// first parameter should be visible
		ndv.getters.inputLabel().eq(0).should('include.text', 'Mode');
		ndv.getters.inputLabel().eq(0).should('be.visible');

		ndv.getters.inlineExpressionEditorInput().should('have.length', 2);

		// last parameter in view should be visible
		ndv.getters.inlineExpressionEditorInput().eq(0).should('have.text', 'should be visible!');
		ndv.getters.inlineExpressionEditorInput().eq(0).should('be.visible');

		// next parameter in view should not be visible
		ndv.getters.inlineExpressionEditorInput().eq(1).should('have.text', 'not visible');
		ndv.getters.inlineExpressionEditorInput().eq(1).should('be.visible');

		ndv.actions.close();
		workflowPage.actions.openNode('Schedule Trigger');

		// first parameter (notice) should be visible
		ndv.getters.nthParam(0).should('include.text', 'This workflow will run on the schedule ');
		ndv.getters.inputLabel().eq(0).should('be.visible');

		ndv.getters.inlineExpressionEditorInput().should('have.length', 2);

		// last parameter in view should be visible
		ndv.getters.inlineExpressionEditorInput().eq(0).should('have.text', 'should be visible');
		ndv.getters.inlineExpressionEditorInput().eq(0).should('be.visible');

		// next parameter in view should not be visible
		ndv.getters.inlineExpressionEditorInput().eq(1).should('have.text', 'not visible');
		ndv.getters.inlineExpressionEditorInput().eq(1).should('not.be.visible');

		ndv.actions.close();
		workflowPage.actions.openNode('Slack');

		// first field (credentials) should be visible
		ndv.getters.nodeCredentialsLabel().should('be.visible');

		// last parameter in view should be visible
		ndv.getters.inlineExpressionEditorInput().eq(0).should('have.text', 'should be visible');
		ndv.getters.inlineExpressionEditorInput().eq(0).should('be.visible');

		// next parameter in view should not be visible
		ndv.getters.inlineExpressionEditorInput().eq(1).should('have.text', 'not visible');
		ndv.getters.inlineExpressionEditorInput().eq(1).should('not.be.visible');
	});

	it('NODE-1272 ensure expressions scrolled to top, not middle', () => {
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Test-workflow-with-long-parameters.json');
		workflowPage.actions.openNode('With long expression');

		ndv.getters.inlineExpressionEditorInput().eq(0).should('be.visible');
		// should be scrolled at top
		ndv.getters
			.inlineExpressionEditorInput()
			.eq(0)
			.find('.cm-line')
			.eq(0)
			.should('have.text', '1 visible!');
		ndv.getters.inlineExpressionEditorInput().eq(0).find('.cm-line').eq(0).should('be.visible');
		ndv.getters
			.inlineExpressionEditorInput()
			.eq(0)
			.find('.cm-line')
			.eq(6)
			.should('have.text', '7 not visible!');
		ndv.getters.inlineExpressionEditorInput().eq(0).find('.cm-line').eq(6).should('not.be.visible');
	});
});
