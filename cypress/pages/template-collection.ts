export function visitTemplateCollectionPage(withFixture: Fixture) {
	cy.intercept(
		'GET',
		`https://api.n8n.io/api/templates/collections/${testData.ecommerceStarterPack.id}`,
		{
			fixture: withFixture.fixture,
		},
	).as('getTemplateCollection');

	cy.visit(`/collections/${withFixture.id}`);

	cy.wait('@getTemplateCollection');
}

export function clickUseWorkflowButtonByTitle(workflowTitle: string) {
	cy.getByTestId('template-card')
		.contains('[data-test-id=template-card]', workflowTitle)
		.realHover({ position: 'center' })
		.findChildByTestId('use-workflow-button')
		.click({ force: true });
}

export type Fixture = {
	id: number;
	fixture: string;
};

export const testData = {
	ecommerceStarterPack: {
		id: 1,
		fixture: 'Ecommerce_starter_pack_template_collection.json',
	},
};
