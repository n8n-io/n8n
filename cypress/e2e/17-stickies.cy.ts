import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const workflowPage = new WorkflowPageClass();

describe('Canvas Actions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowPage.actions.visit();
		cy.waitForLoad();
	});

	it('adds sticky to canvas with default text and position', () => {
		workflowPage.getters.addStickyButton().should('not.be.visible');
		workflowPage.actions.addSticky();
		cy.wait(100);

		workflowPage.getters.stickies().should('have.length', 1)
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n')
			.find('a').contains('Guide').should('have.attr', 'href');

			// , 'left: 400px; top: 340px;'
	});

	// it('always adds stickies in the middle of the canvas', () => {

	// });

	// it('drags sticky around and position is saved correctly', () => {

	// });

	// it('deletes sticky', () => {

	// });

	// it('edits sticky and updates content', () => {

	// });

	// it('expands sticky from all sides and size is saved correctly', () => {

	// });

	// it('is positioned behind nodes and above when editing', () => {

	// });

	// it('is positioned based on size', () => {

	// });
});
