import { WorkflowPage } from "../pages";

const workflowPage = new WorkflowPage();

const INVALID_NAMES = [
	'https://n8n.io',
	'http://n8n.io',
	'www.n8n.io',
	'n8n.io',
	'n8n.бг',
	'n8n.io/home',
	'n8n.io/home?send=true',
	'<a href="#">Jack</a>',
	'<script>alert("Hello")</script>',
];

const VALID_NAMES = [
	['a', 'a'],
	['alice', 'alice'],
	['Robert', 'Downey Jr.'],
	['Mia', 'Mia-Downey'],
	['Mark', "O'neil"],
	['Thomas', 'Müler'],
	['ßáçøñ', 'ßáçøñ'],
	['أحمد', 'فلسطين'],
	['Милорад', 'Филиповић'],
];

describe('Personal Settings', () => {
	it ('should allow to change first and last name', () => {
		cy.visit('/settings/personal');
		VALID_NAMES.forEach((name) => {
			cy.getByTestId('personal-data-form').find('input[name="firstName"]').clear().type(name[0]);
			cy.getByTestId('personal-data-form').find('input[name="lastName"]').clear().type(name[1]);
			cy.getByTestId('save-settings-button').click();
			workflowPage.getters.successToast().should('contain', 'Personal details updated');
			workflowPage.getters.successToast().find('.el-notification__closeBtn').click();
		});
	});
	it('not allow malicious values for personal data', () => {
		cy.visit('/settings/personal');
		INVALID_NAMES.forEach((name) => {
			cy.getByTestId('personal-data-form').find('input[name="firstName"]').clear().type(name);
			cy.getByTestId('personal-data-form').find('input[name="lastName"]').clear().type(name);
			cy.getByTestId('save-settings-button').click();
			workflowPage.getters
				.errorToast()
				.should('contain', 'Malicious firstName | Malicious lastName');
			workflowPage.getters.errorToast().find('.el-notification__closeBtn').click();
		});
	});
});
