import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('ADO-2111 expressions should support pinned data', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('supports pinned data in expressions unexecuted and executed parent nodes', () => {
		cy.createFixtureWorkflow('Test_workflow_pinned_data_in_expressions.json', 'Expressions');

		// test previous node unexecuted
		workflowPage.actions.openNode('NotPinnedWithExpressions');
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(0)
			.should('include.text', 'Joe\nJoe\nJoan\nJoan\nJoe\nJoan\n\nJoe\nJoan\n\nJoe');
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(1)
			.should('contain.text', '0,0\nJoe\n\nJoe\n\nJoe\n\nJoe\nJoe');

		// test can resolve correctly based on item
		ndv.actions.switchInputMode('Table');

		ndv.getters.inputTableRow(2).realHover();
		cy.wait(50);
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(0)
			.should('include.text', 'Joe\nJoe\nJoan\nJoan\nJoe\nJoan\n\nJoe\nJoan\n\nJoe');
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(1)
			.should('contain.text', '0,1\nJoan\n\nJoan\n\nJoan\n\nJoan\nJoan');

		// test previous node executed
		ndv.actions.execute();
		ndv.getters.inputTableRow(1).realHover();
		cy.wait(50);

		ndv.getters
			.parameterExpressionPreview('value')
			.eq(0)
			.should('include.text', 'Joe\nJoe\nJoan\nJoan\nJoe\nJoan\n\nJoe\nJoan\n\nJoe');

		ndv.getters
			.parameterExpressionPreview('value')
			.eq(1)
			.should('contain.text', '0,0\nJoe\n\nJoe\n\nJoe\n\nJoe\nJoe');

		ndv.getters.inputTableRow(2).realHover();
		cy.wait(50);
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(0)
			.should('include.text', 'Joe\nJoe\nJoan\nJoan\nJoe\nJoan\n\nJoe\nJoan\n\nJoe');
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(1)
			.should('contain.text', '0,1\nJoan\n\nJoan\n\nJoan\n\nJoan\nJoan');

		// check it resolved correctly on the backend
		ndv.getters
			.outputTbodyCell(1, 0)
			.should('contain.text', 'Joe\\nJoe\\nJoan\\nJoan\\nJoe\\nJoan\\n\\nJoe\\nJoan\\n\\nJoe');

		ndv.getters
			.outputTbodyCell(2, 0)
			.should('contain.text', 'Joe\\nJoe\\nJoan\\nJoan\\nJoe\\nJoan\\n\\nJoe\\nJoan\\n\\nJoe');

		ndv.getters
			.outputTbodyCell(1, 1)
			.should('contain.text', '0,0\\nJoe\\n\\nJoe\\n\\nJoe\\n\\nJoe\\nJoe');

		ndv.getters
			.outputTbodyCell(2, 1)
			.should('contain.text', '0,1\\nJoan\\n\\nJoan\\n\\nJoan\\n\\nJoan\\nJoan');
	});

	it('resets expressions after node is unpinned', () => {
		cy.createFixtureWorkflow('Test_workflow_pinned_data_in_expressions.json', 'Expressions');

		// test previous node unexecuted
		workflowPage.actions.openNode('NotPinnedWithExpressions');
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(0)
			.should('include.text', 'Joe\nJoe\nJoan\nJoan\nJoe\nJoan\n\nJoe\nJoan\n\nJoe');
		ndv.getters
			.parameterExpressionPreview('value')
			.eq(1)
			.should('contain.text', '0,0\nJoe\n\nJoe\n\nJoe\n\nJoe\nJoe');

		ndv.actions.close();

		// unpin pinned node
		workflowPage.getters
			.canvasNodeByName('PinnedSet')
			.eq(0)
			.find('.node-pin-data-icon')
			.should('exist');
		workflowPage.getters.canvasNodeByName('PinnedSet').eq(0).click();
		workflowPage.actions.hitPinNodeShortcut();
		workflowPage.getters
			.canvasNodeByName('PinnedSet')
			.eq(0)
			.find('.node-pin-data-icon')
			.should('not.exist');

		workflowPage.actions.openNode('NotPinnedWithExpressions');
		ndv.getters.nodeParameters().find('parameter-expression-preview-value').should('not.exist');

		ndv.getters.parameterInput('value').eq(0).click();
		ndv.getters
			.inlineExpressionEditorOutput()
			.should(
				'have.text',
				'[Execute node ‘PinnedSet’ for preview][Execute node ‘PinnedSet’ for preview][Execute node ‘PinnedSet’ for preview][Execute node ‘PinnedSet’ for preview][Execute node ‘PinnedSet’ for preview][Execute node ‘PinnedSet’ for preview][Execute previous nodes for preview][Execute previous nodes for preview][undefined]',
			);

		// close open expression
		ndv.getters.inputLabel().eq(0).click();

		ndv.getters.parameterInput('value').eq(1).click();
		ndv.getters
			.inlineExpressionEditorOutput()
			.should(
				'have.text',
				'0,0[Execute node ‘PinnedSet’ for preview][Execute node ‘PinnedSet’ for preview][Execute previous nodes for preview][Execute previous nodes for preview][Execute previous nodes for preview]',
			);
	});
});
