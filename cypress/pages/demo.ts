import { BasePage } from './base';

export class DemoPage extends BasePage {
	url = '/workflows/demo';

	getters = {
	};

	actions = {
		visit: (theme?: 'dark' | 'light') => {
			const query = theme ? `?theme=${theme}` : '';
			cy.visit(this.url + query);
			cy.waitForLoad();
			cy.window().then((win) => {
				// @ts-ignore
				win.preventNodeViewBeforeUnload = true;
			});
		},
		importWorkflow(workflow: object) {
			const OPEN_WORKFLOW = {command: 'openWorkflow', workflow};
			cy.window().then($window => {
				const message = JSON.stringify(OPEN_WORKFLOW);
				$window.postMessage(message, '*')
			});
		}
	}
}

