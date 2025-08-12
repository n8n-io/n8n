import {
	getBecomeTemplateCreatorCta,
	getCloseBecomeTemplateCreatorCtaButton,
	interceptCtaRequestWithResponse,
} from '../composables/becomeTemplateCreatorCta';
import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';

const WorkflowsPage = new WorkflowsPageClass();

// Migrated to Playwright
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('Become creator CTA', () => {
	it('should not show the CTA if user is not eligible', () => {
		interceptCtaRequestWithResponse(false).as('cta');
		cy.visit(WorkflowsPage.url);

		cy.wait('@cta');

		getBecomeTemplateCreatorCta().should('not.exist');
	});

	it('should show the CTA if the user is eligible', () => {
		interceptCtaRequestWithResponse(true).as('cta');
		cy.visit(WorkflowsPage.url);

		cy.wait('@cta');

		getBecomeTemplateCreatorCta().should('be.visible');

		getCloseBecomeTemplateCreatorCtaButton().click();

		getBecomeTemplateCreatorCta().should('not.exist');
	});
});
