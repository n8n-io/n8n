import { BasePage } from './base';

export class WorkerViewPage extends BasePage {
	url = '/settings/workers';

	getters = {
		workerCards: () => cy.getByTestId('worker-card'),
		workerCard: (workerId: string) => this.getters.workerCards().contains(workerId),
		workerViewLicensed: () => cy.getByTestId('worker-view-licensed'),
		workerViewUnlicensed: () => cy.getByTestId('worker-view-unlicensed'),
		menuItems: () => cy.get('.el-menu-item'),
		menuItem: () => this.getters.menuItems().get('#settings-workersview'),
	};

	actions = {};
}
