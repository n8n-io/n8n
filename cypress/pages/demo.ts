/**
 * Actions
 */

export function visitDemoPage(theme?: 'dark' | 'light') {
	const query = theme ? `?theme=${theme}` : '';
	cy.visit('/workflows/demo' + query);
	cy.waitForLoad();
	cy.window().then((win) => {
		win.preventNodeViewBeforeUnload = true;
	});
}

export function importWorkflow(workflow: object) {
	const OPEN_WORKFLOW = { command: 'openWorkflow', workflow };
	cy.window().then(($window) => {
		const message = JSON.stringify(OPEN_WORKFLOW);
		$window.postMessage(message, '*');
	});
}
