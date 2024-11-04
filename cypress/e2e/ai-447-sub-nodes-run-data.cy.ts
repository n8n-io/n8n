import { NDV, WorkflowPage } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

it('should render runItems for sub-nodes and allow switching between them', () => {
	cy.visit(workflowPage.url);
	cy.createFixtureWorkflow('In_memory_vector_store_fake_embeddings.json');
	workflowPage.actions.zoomToFit();

	workflowPage.actions.executeNode('Populate VS');
	cy.get('[data-label="25 items"]').should('exist');

	const assertInputOutputText = (text: string, assertion: 'exist' | 'not.exist') => {
		ndv.getters.outputPanel().contains(text).should(assertion);
		ndv.getters.inputPanel().contains(text).should(assertion);
	};

	workflowPage.actions.openNode('Character Text Splitter');
	ndv.getters.outputRunSelector().should('exist');
	ndv.getters.inputRunSelector().should('exist');
	ndv.getters.inputRunSelector().find('input').should('include.value', '3 of 3');
	ndv.getters.outputRunSelector().find('input').should('include.value', '3 of 3');
	assertInputOutputText('Kyiv', 'exist');
	assertInputOutputText('Berlin', 'not.exist');
	assertInputOutputText('Prague', 'not.exist');

	ndv.actions.changeOutputRunSelector('2 of 3');
	assertInputOutputText('Berlin', 'exist');
	assertInputOutputText('Kyiv', 'not.exist');
	assertInputOutputText('Prague', 'not.exist');

	ndv.actions.changeOutputRunSelector('1 of 3');
	assertInputOutputText('Prague', 'exist');
	assertInputOutputText('Berlin', 'not.exist');
	assertInputOutputText('Kyiv', 'not.exist');

	ndv.actions.toggleInputRunLinking();
	ndv.actions.changeOutputRunSelector('2 of 3');
	ndv.getters.inputRunSelector().find('input').should('include.value', '1 of 3');
	ndv.getters.outputRunSelector().find('input').should('include.value', '2 of 3');
	ndv.getters.inputPanel().contains('Prague').should('exist');
	ndv.getters.inputPanel().contains('Berlin').should('not.exist');

	ndv.getters.outputPanel().contains('Berlin').should('exist');
	ndv.getters.outputPanel().contains('Prague').should('not.exist');

	ndv.actions.toggleInputRunLinking();
	ndv.getters.inputRunSelector().find('input').should('include.value', '1 of 3');
	ndv.getters.outputRunSelector().find('input').should('include.value', '1 of 3');
	assertInputOutputText('Prague', 'exist');
	assertInputOutputText('Berlin', 'not.exist');
	assertInputOutputText('Kyiv', 'not.exist');
});
