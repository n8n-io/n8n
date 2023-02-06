import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { SettingsUsersPage as SettingsUsersPageClass } from '../pages/settings-users';

/**
 * User A - Instance owner
 * User B - User, owns C1, W1, W2
 * User C - User, owns C2
 *
 * W1 - Workflow owned by User B, shared with User C
 * W2 - Workflow owned by User B
 *
 * C1 - Credential owned by User B
 * C2 - Credential owned by User C, shared with User A and User B
 */

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();
const SettingsUsersPage = new SettingsUsersPageClass();

const instanceOwner = {
	email: `${DEFAULT_USER_EMAIL}A`,
	password: DEFAULT_USER_PASSWORD,
	firstName: 'User',
	lastName: 'A',
};

const users = [
	{
		email: `${DEFAULT_USER_EMAIL}B`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'B',
	},
	{
		email: `${DEFAULT_USER_EMAIL}C`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'C',
	},
];

describe('Workflows', () => {
	before(() => {
		cy.resetAll();
		cy.setupOwner(instanceOwner);
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');

			return false;
		});
	});

	it('should invite User B and User C to instance', () => {
		cy.signin(instanceOwner);
		cy.visit(SettingsUsersPage.url);

		const inviteLinks = SettingsUsersPage.actions.inviteMultipleUsers(
			users.map((user) => user.email),
		);
		users.forEach((user, index) => {
			cy.visit(inviteLinks[index]);
			cy.setup(user);
		});
	});

	// it('should create Workflow W1 logged in as User B', () => {
	// 	cy.signin({ email: users[1].email, password: users[1].password });
	// 	cy.visit(WorkflowsPage.url);
	//
	// 	WorkflowsPage.getters.newWorkflowButtonCard().click();
	// 	cy.createFixtureWorkflow('Test_workflow_2.json', 'Workflow W1');
	//
	// 	WorkflowsPage.getters.workflowCards().should('have.length', 1);
	// });
	//
	// it('should create and share Workflow W2 logged in as User B', () => {
	// 	cy.signin({ email: users[1].email, password: users[1].password });
	// 	cy.visit(WorkflowsPage.url);
	//
	// 	WorkflowsPage.getters.createWorkflowButton().click();
	// 	cy.createFixtureWorkflow('Test_workflow_2.json', 'Workflow W2');
	// 	WorkflowsPage.getters.workflowCards().should('have.length', 2);
	//
	// 	WorkflowPage.actions.openShareModal();
	// });
});
