// Migrated to Playwright
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('Environment Feature Flags', () => {
	it('should set feature flags at runtime and load it back in envFeatureFlags from backend settings', () => {
		cy.setEnvFeatureFlags({
			N8N_ENV_FEAT_TEST: true,
		});
		cy.signinAsOwner();
		cy.intercept('GET', '/rest/settings').as('getSettings');
		cy.visit('/');
		cy.wait('@getSettings').then((interception) => {
			expect(interception.response?.body.data.envFeatureFlags).to.be.an('object');
			expect(interception.response?.body.data.envFeatureFlags['N8N_ENV_FEAT_TEST']).to.equal(
				'true',
			);
		});
	});

	it('should reset feature flags at runtime', () => {
		cy.setEnvFeatureFlags({
			N8N_ENV_FEAT_TEST: true,
		});
		cy.signinAsOwner();
		cy.intercept('GET', '/rest/settings').as('getSettings');
		cy.visit('/');
		cy.wait('@getSettings').then((interception) => {
			expect(interception.response?.body.data.envFeatureFlags['N8N_ENV_FEAT_TEST']).to.equal(
				'true',
			);
		});

		cy.clearEnvFeatureFlags();
		cy.visit('/');
		cy.wait('@getSettings').then((interception) => {
			expect(interception.response?.body.data.envFeatureFlags).to.be.an('object');
			expect(interception.response?.body.data.envFeatureFlags['N8N_ENV_FEAT_TEST']).to.be.undefined;
		});
	});
});
