import { NDV, WorkflowPage } from '../pages';

const canvas = new WorkflowPage();
const ndv = new NDV();

describe('Manual partial execution', () => {
	it('should not execute parent nodes with no run data', () => {
		canvas.actions.visit();

		cy.fixture('manual-partial-execution.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

		canvas.actions.zoomToFit();

		canvas.actions.openNode('Edit Fields');

		cy.get('button').contains('Test step').click(); // create run data
		cy.get('button').contains('Test step').click(); // use run data

		ndv.actions.close();

		canvas.actions.openNode('Webhook1');

		ndv.getters.nodeRunSuccessIndicator().should('not.exist');
		ndv.getters.nodeRunTooltipIndicator().should('not.exist');
		ndv.getters.outputRunSelector().should('not.exist');
	});
});
