import { META_KEY } from '../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const workflowPage = new WorkflowPageClass();

describe('Canvas Actions', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
		cy.get('#collapse-change-button').should('be.visible').click();
		cy.get('#side-menu[class*=collapsed i]').should('be.visible');
		workflowPage.actions.zoomToFit();
	});

	it('adds sticky to canvas with default text and position', () => {
		workflowPage.getters.addStickyButton().should('be.visible');

		addDefaultSticky();
		workflowPage.actions.deselectAll();
		workflowPage.actions.addStickyFromContextMenu();
		workflowPage.actions.hitAddSticky();

		workflowPage.getters.stickies().should('have.length', 3);

		// Should not add a sticky for ctrl+shift+s
		cy.get('body').type(`{${META_KEY}+shift+s}`);

		workflowPage.getters.stickies().should('have.length', 3);
		workflowPage.getters
			.stickies()
			.eq(0)
			.should('have.text', 'I’m a note\nDouble click to edit me. Guide\n')
			.find('a')
			.contains('Guide')
			.should('have.attr', 'href');
	});
});

function shouldHaveOneSticky() {
	workflowPage.getters.stickies().should('have.length', 1);
}

function shouldBeInDefaultLocation() {
	workflowPage.getters
		.stickies()
		.eq(0)
		.should(($el) => {
			expect($el).to.have.css('height', '160px');
			expect($el).to.have.css('width', '240px');
		});
}

function shouldHaveDefaultSize() {
	workflowPage.getters.stickies().should(($el) => {
		expect($el).to.have.css('height', '160px');
		expect($el).to.have.css('width', '240px');
	});
}

function addDefaultSticky() {
	workflowPage.actions.addSticky();
	shouldHaveOneSticky();
	shouldHaveDefaultSize();
	shouldBeInDefaultLocation();
}
