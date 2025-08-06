import OnboardingWorkflow from '../fixtures/Onboarding_workflow.json';
import WorkflowTemplate from '../fixtures/Workflow_template_write_http_query.json';
import { MainSidebar } from '../pages/sidebar/main-sidebar';
import { TemplatesPage } from '../pages/templates';
import { WorkflowPage } from '../pages/workflow';
import { WorkflowsPage } from '../pages/workflows';

const templatesPage = new TemplatesPage();
const workflowPage = new WorkflowPage();
const workflowsPage = new WorkflowsPage();
const mainSidebar = new MainSidebar();

describe('Workflow templates', () => {
	const mockTemplateHost = (host: string) => {
		cy.overrideSettings({
			templates: { enabled: true, host },
		});
	};

	describe('For api.n8n.io', () => {
		beforeEach(() => {
			mockTemplateHost('https://api.n8n.io/api/');
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
			cy.intercept(
				{
					hostname: 'n8n.io',
					pathname: '/workflows',
				},
				'Mock Template Page',
			).as('templatesPage');

			cy.visit(templatesPage.url);

			cy.wait('@templatesPage');
		});
	});

	describe('For a custom template host', () => {
		const hostname = 'random.domain';
		const categories = [
			{ id: 1, name: 'Engineering' },
			{ id: 2, name: 'Finance' },
			{ id: 3, name: 'Sales' },
		];
		const collections = [
			{
				id: 1,
				name: 'Test Collection',
				workflows: [{ id: 1 }],
				nodes: [],
			},
		];

		beforeEach(() => {
			cy.intercept({ hostname, pathname: '/api/health' }, { status: 'OK' });
			cy.intercept({ hostname, pathname: '/api/templates/categories' }, { categories });
			cy.intercept(
				{ hostname, pathname: '/api/templates/collections', query: { category: '**' } },
				(req) => {
					req.reply({ collections: req.query['category[]'] === '3' ? [] : collections });
				},
			);
			cy.intercept(
				{ hostname, pathname: '/api/templates/search', query: { category: '**' } },
				(req) => {
					const fixture =
						req.query.category === 'Sales'
							? 'templates_search/sales_templates_search_response.json'
							: 'templates_search/all_templates_search_response.json';
					req.reply({ statusCode: 200, fixture });
				},
			);

			cy.intercept(
				{ hostname, pathname: '/api/workflows/templates/1' },
				{
					statusCode: 200,
					body: {
						id: 1,
						name: OnboardingWorkflow.name,
						workflow: OnboardingWorkflow,
					},
				},
			).as('getTemplate');

			cy.intercept(
				{ hostname, pathname: '/api/templates/workflows/1' },
				{
					statusCode: 200,
					body: WorkflowTemplate,
				},
			).as('getTemplatePreview');

			mockTemplateHost(`https://${hostname}/api`);
		});

		it('can open onboarding flow', () => {
			templatesPage.actions.openOnboardingFlow();
			cy.url().should('match', /.*\/workflow\/.*?onboardingId=1$/);

			workflowPage.actions.shouldHaveWorkflowName('Demo: ' + OnboardingWorkflow.name);
			workflowPage.getters.canvasNodes().should('have.length', 4);
			workflowPage.getters.stickies().should('have.length', 1);
		});

		it('can import template', () => {
			templatesPage.actions.importTemplate();
			cy.url().should('include', '/workflow/new?templateId=1');

			workflowPage.getters.canvasNodes().should('have.length', 4);
			workflowPage.getters.stickies().should('have.length', 1);
			workflowPage.actions.shouldHaveWorkflowName(OnboardingWorkflow.name);
		});

		it('should save template id with the workflow', () => {
			cy.intercept('POST', '/rest/workflows').as('saveWorkflow');
			templatesPage.actions.importTemplate();

			cy.visit(templatesPage.url);
			cy.get('.el-skeleton.n8n-loading').should('not.exist');
			templatesPage.getters.firstTemplateCard().should('exist');
			templatesPage.getters.templatesLoadingContainer().should('not.exist');
			templatesPage.getters.firstTemplateCard().click();
			cy.url().should('include', '/templates/1');
			cy.wait('@getTemplatePreview');

			templatesPage.getters.useTemplateButton().click();
			cy.url().should('include', '/workflow/new');
			workflowPage.actions.saveWorkflowOnButtonClick();

			workflowPage.actions.hitSelectAll();
			workflowPage.actions.hitCopy();

			cy.wait('@saveWorkflow').then((interception) => {
				expect(interception.request.body.meta.templateId).to.equal('1');
			});
		});

		it('can open template with images and hides workflow screenshots', () => {
			cy.visit(`${templatesPage.url}/1`);
			cy.wait('@getTemplatePreview');

			templatesPage.getters.description().find('img').should('have.length', 1);
		});

		it('renders search elements correctly', () => {
			cy.visit(templatesPage.url);
			templatesPage.getters.searchInput().should('exist');
			templatesPage.getters.allCategoriesFilter().should('exist');
			templatesPage.getters.categoryFilters().should('have.length.greaterThan', 1);
			templatesPage.getters.templateCards().should('have.length.greaterThan', 0);
		});

		it('can filter templates by category', () => {
			cy.visit(templatesPage.url);
			templatesPage.getters.templatesLoadingContainer().should('not.exist');
			templatesPage.getters.categoryFilter('sales').should('exist');
			let initialTemplateCount = 0;
			let initialCollectionCount = 0;

			templatesPage.getters.templateCountLabel().then(($el) => {
				initialTemplateCount = parseInt($el.text().replace(/\D/g, ''), 10);
				templatesPage.getters.collectionCountLabel().then(($el1) => {
					initialCollectionCount = parseInt($el1.text().replace(/\D/g, ''), 10);

					templatesPage.getters.categoryFilter('sales').click();
					templatesPage.getters.templatesLoadingContainer().should('not.exist');

					// Should have less templates and collections after selecting a category
					templatesPage.getters.templateCountLabel().should(($el2) => {
						expect(parseInt($el2.text().replace(/\D/g, ''), 10)).to.be.lessThan(
							initialTemplateCount,
						);
					});
					templatesPage.getters.collectionCountLabel().should(($el2) => {
						expect(parseInt($el2.text().replace(/\D/g, ''), 10)).to.be.lessThan(
							initialCollectionCount,
						);
					});
				});
			});
		});

		it('should preserve search query in URL', () => {
			cy.visit(templatesPage.url);
			templatesPage.getters.templatesLoadingContainer().should('not.exist');
			templatesPage.getters.categoryFilter('sales').should('exist');
			templatesPage.getters.categoryFilter('sales').click();
			templatesPage.getters.searchInput().type('auto');

			cy.url().should('include', '?categories=');
			cy.url().should('include', '&search=');

			cy.reload();

			// Should preserve search query in URL
			cy.url().should('include', '?categories=');
			cy.url().should('include', '&search=');

			// Sales category should still be selected
			templatesPage.getters
				.categoryFilter('sales')
				.find('label')
				.should('have.class', 'is-checked');
			// Search input should still have the search query
			templatesPage.getters.searchInput().should('have.value', 'auto');
			// Sales checkbox should be pushed to the top
			templatesPage.getters
				.categoryFilters()
				.eq(1)
				.then(($el) => {
					expect($el.text()).to.equal('Sales');
				});
		});
	});
});
