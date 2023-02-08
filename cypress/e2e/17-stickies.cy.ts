import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

describe('Canvas Actions', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		WorkflowPage.actions.visit();
		cy.waitForLoad();
	});

	it('adds sticky to canvas with default text and position', () => {

	});

	it('drags sticky around and position is saved correctly', () => {

	});

	it('deletes sticky', () => {

	});

	it('edits sticky and updates content', () => {

	});

	it('expands sticky from all sides and size is saved correctly', () => {

	});

	it('is positioned behind nodes and above when editing', () => {

	});

	it('is positioned based on size', () => {

	});
});
