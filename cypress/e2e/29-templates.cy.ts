import { TemplatesPage } from '../pages/templates';
import { WorkflowsPage } from '../pages/workflows';
import { MainSidebar } from '../pages/sidebar/main-sidebar';

const templatesPage = new TemplatesPage();
const workflowsPage = new WorkflowsPage();
const mainSidebar = new MainSidebar();

describe('Workflow templates', () => {
	beforeEach(() => {
		cy.intercept('GET', '**/rest/settings', (req) => {
			// Disable cache
			delete req.headers['if-none-match'];
			req.reply((res) => {
				if (res.body.data) {
					// Disable custom templates host if it has been overridden by another intercept
					res.body.data.templates = { enabled: true, host: 'https://api.n8n.io/api/' };
				}
			});
		}).as('settingsRequest');
	});

	it('Opens website when clicking templates sidebar link', () => {
		cy.visit(workflowsPage.url);
		mainSidebar.getters.templates().should('be.visible');
		// Templates should be a link to the website
		mainSidebar.getters
			.templates()
			.parent('a')
			.should('have.attr', 'href')
			.and('include', 'https://n8n.io/workflows');
		// Link should contain instance address and n8n version
		mainSidebar.getters
			.templates()
			.parent('a')
			.then(($a) => {
				const href = $a.attr('href');
				const params = new URLSearchParams(href);
				// Link should have all mandatory parameters expected on the website
				expect(decodeURIComponent(`${params.get('utm_instance')}`)).to.include(
					window.location.origin,
				);
				expect(params.get('utm_n8n_version')).to.match(/[0-9]+\.[0-9]+\.[0-9]+/);
				expect(params.get('utm_awc')).to.match(/[0-9]+/);
			});
		mainSidebar.getters.templates().parent('a').should('have.attr', 'target', '_blank');
	});

	it('Redirects to website when visiting templates page directly', () => {
		cy.visit(templatesPage.url);
		cy.origin('https://n8n.io', () => {
			cy.url().should('include', 'https://n8n.io/workflows');
		});
	});
});
