describe('Smoke test', () => {
	describe('Create user', () => {
		it('should reach the setup page', () => {
			cy.visit('/setup');
		});

		it('should fill in the signup form and submit', () => {
			cy.getByTestId('setup-form').within(() => {
				cy.getByTestId('email').type('test@n8n.io');
				cy.getByTestId('firstName').type('John');
				cy.getByTestId('lastName').type('Doe');
				cy.getByTestId('password').type('CypressTest123');
				cy.wait(1000);
				cy.get('button').click();
			});

			cy.url().should('include', '/workflow')
		});

		it('should fill in the signin form and submit', () => {
			cy.visit('/signin')

			cy.getByTestId('signin-form').within(() => {
				cy.getByTestId('email').type('test@n8n.io');
				cy.getByTestId('password').type('CypressTest123');

				cy.wait(1000);
				cy.get('button').click();
			});

			// we should be redirected to /dashboard
			cy.url().should('include', '/workflow')

			// our auth cookie should be present
			cy.getCookie('n8n-auth').should('exist')
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
				cy.wait(1000);
				cy.get('button').click();
			});
		});
	});
});
