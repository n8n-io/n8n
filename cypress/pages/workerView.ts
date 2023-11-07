import { BasePage } from './base';

export class WorkerViewPage extends BasePage {
	url = '/workersview';
	getters = {
		workerCards: () => cy.getByTestId('resources-list-item'),
		workerCard: (workerId: string) =>
			this.getters
				.workflowCards()
				.contains(workerId)
				.parents('[data-test-id="resources-list-item"]'),
		workerViewLicensed: () => cy.getByTestId('worker-view-licensed'),
		workerViewUnlicensed: () => cy.getByTestId('worker-view-unlicensed'),
		menuItem: () => cy.getByTestId('menu-item').contains('Workers'),
		menuItems: () => cy.getByTestId('menu-item'),
	};

	actions = {};
}
