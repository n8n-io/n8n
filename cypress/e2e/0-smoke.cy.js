describe('Smoke test', () => {
	const username = 'test@n8n.io';
	const password = 'CypressTest123';

	it('should sign user up', () => {
		cy.signup(username, 'John', 'Doe', password);
		cy.clearCookies();
	});

	describe('Create user', () => {
		beforeEach(() => {
			cy.signin(username, password);
		});

		it('should fill in the customize form and submit', () => {
			cy.getByTestId('personalization-form').within(() => {
				cy.get('[data-test-id="codingSkill"] .el-select').click();
				cy.get('[data-test-id="codingSkill"] .el-select-dropdown__item').eq(0).click();
				cy.get('[data-test-id="companyType"] .el-select').click();
				cy.get('[data-test-id="companyType"] .el-select-dropdown__item').eq(0).click();
				cy.get('[data-test-id="customerType"] .el-select').click();
				cy.get('[data-test-id="customerType"] .el-select-dropdown__item').eq(2).click();
				cy.get('[data-test-id="automationGoal"] .el-select').click();
				cy.get('[data-test-id="automationGoal"] .el-select-dropdown__item').eq(-1).click();
				cy.get('[data-test-id="companySize"] .el-select').click();
				cy.get('[data-test-id="companySize"] .el-select-dropdown__item').eq(1).click();

				cy.get('button').click();
				cy.get('button').click();
			});
		});

		it('should add a new Function node', () => {
			cy.getByTestId('add-node-button').click();
			cy.getByTestId('search-nodes-input').type('Function');

			cy.get('[data-key="n8n-nodes-base.function"]').click();
		});
	});
});
