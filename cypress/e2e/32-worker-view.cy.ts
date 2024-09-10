import { WorkerViewPage } from '../pages';

const workerViewPage = new WorkerViewPage();

describe('Worker View (unlicensed)', () => {
	beforeEach(() => {
		cy.disableFeature('workerView');
		cy.disableQueueMode();
	});

	it('should not show up in the menu sidebar', () => {
		cy.signinAsMember(0);
		cy.visit(workerViewPage.url);
		workerViewPage.getters.menuItem().should('not.exist');
	});

	it('should show action box', () => {
		cy.signinAsMember(0);
		cy.visit(workerViewPage.url);
		workerViewPage.getters.workerViewUnlicensed().should('exist');
	});
});

describe('Worker View (licensed)', () => {
	beforeEach(() => {
		cy.enableFeature('workerView');
		cy.enableQueueMode();
	});

	it('should show up in the menu sidebar', () => {
		cy.signinAsOwner();
		cy.enableQueueMode();
		cy.visit(workerViewPage.url);
		workerViewPage.getters.menuItem().should('exist');
	});

	it('should show worker list view', () => {
		cy.signinAsMember(0);
		cy.visit(workerViewPage.url);
		workerViewPage.getters.workerViewLicensed().should('exist');
	});
});
