const username = 'test@n8n.io';
const password = 'CypressTest123';

describe('Create user', () => {
	it('should sign user up', () => {
		cy.signup(username, 'John', 'Doe', password);
	});
});

describe('Smoke test', () => {
	// beforeEach(() => {
	// 	cy.signin(username, password);
	// });

	// describe('Onboarding', () => {
	// 	it('should fill in the customize form and submit', () => {
	// 		cy.visit('/workflow');
	// 		cy.getByTestId('personalization-form').within(() => {
	// 			cy.get('[data-test-id="codingSkill"] .el-select').click();
	// 			cy.get('[data-test-id="codingSkill"] .el-select-dropdown__item').eq(0).click();
	// 			cy.get('[data-test-id="companyType"] .el-select').click();
	// 			cy.get('[data-test-id="companyType"] .el-select-dropdown__item').eq(0).click();
	// 			cy.get('[data-test-id="customerType"] .el-select').click();
	// 			cy.get('[data-test-id="customerType"] .el-select-dropdown__item').eq(2).click();
	// 			cy.get('[data-test-id="automationGoal"] .el-select').click();
	// 			cy.get('[data-test-id="automationGoal"] .el-select-dropdown__item').eq(-1).click();
	// 			cy.get('[data-test-id="companySize"] .el-select').click();
	// 			cy.get('[data-test-id="companySize"] .el-select-dropdown__item').eq(1).click();
	//
	// 			cy.get('button').click();
	// 			cy.get('button').click();
	// 		});
	// 	});
	// });

	// describe('Create workflow', () => {
	// 	it('should add a new Function node', () => {
	// 		cy.visit('/workflow');
	// 		cy.getByTestId('add-node-button').click();
	// 		cy.getByTestId('search-nodes-input').type('Function');
	//
	// 		cy.get('[data-key="n8n-nodes-base.function"]').click();
	//
	// 		cy.getByTestId('back-to-canvas').click();
	// 		cy.getByTestId('save-button').click();
	// 	});
	//
	// 	it('should add a new Set node', () => {
	// 		cy.visit('/workflow/1');
	//
	// 		cy.get('#node-2').click();
	// 		cy.getByTestId('add-node-button').click();
	// 		cy.getByTestId('search-nodes-input').type('Set');
	//
	// 		cy.get('[data-key="n8n-nodes-base.set"]').click();
	//
	// 		cy.getByTestId('node-parameters').within(() => {
	// 			cy.get('.multi-parameter .add-option').click(); // Click Add Value
	// 			cy.get('.el-select .el-select-dropdown__item').eq(2).click(); // Click String
	//
	// 			cy.get('.parameter-value-container').eq(1).within(() => {
	// 				cy.get('input').type('={{$node["Function"].json["myNewField"]}}', {
	// 					parseSpecialCharSequences: false
	// 				});
	// 			});
	// 		});
	//
	// 		cy.getByTestId('back-to-canvas').click();
	// 		cy.getByTestId('save-button').click();
	// 	});
	//
	// 	it('should execute workflow', () => {
	// 		cy.visit('/workflow/1');
	//
	// 		cy.getByTestId('execute-workflow').click();
	//
	// 		cy.get('.el-notification .el-icon-success').should('be.visible');
	// 	});
	// });
	//
	// describe('Create new workflow', () => {
	// 	it('should create a new workflow', () => {
	// 		cy.visit('/workflow/1');
	//
	// 		cy.getByTestId('main-sidebar').within(() => {
	// 			cy.getByTestId('main-sidebar-collapse').click();
	// 		});
	//
	// 		cy.getByTestId('main-sidebar').within(() => {
	// 			cy.get('.el-submenu').eq(0).within(() => {
	// 				cy.get('.el-submenu__title').click();
	// 			});
	//
	// 			cy.get('.el-submenu .el-menu').within(() => {
	// 				cy.get('.el-menu-item').eq(0).click();
	// 			});
	//
	// 			cy.location('pathname').should('equal', '/workflow');
	// 		});
	//
	// 		cy.get('.el-notification .el-icon-success').should('be.visible');
	// 	});
	// });
});
