import { BasePage } from './base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
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
