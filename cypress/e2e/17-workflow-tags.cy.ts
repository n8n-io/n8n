import { WorkflowPage } from '../pages';

const wf = new WorkflowPage();

const TEST_TAGS = ['Tag 1', 'Tag 2', 'Tag 3'];

describe('Workflow tags', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		wf.actions.visit();
		cy.waitForLoad();
	});

	it('should create and attach tags inline', () => {
		wf.getters.createTagButton().click();
		wf.actions.addTags(TEST_TAGS);
		wf.getters.tagPills().should('have.length', TEST_TAGS.length);
		wf.getters.nthTagPill(1).click();
		wf.actions.addTags('Tag 4');
		wf.getters.tagPills().should('have.length', TEST_TAGS.length + 1);
		wf.getters.isWorkflowSaved();
	});

	it('should create tags via modal', () => {
		wf.actions.openTagManagerModal();

		const [first, second] = TEST_TAGS;

		cy.contains('Create a tag').click();
		cy.getByTestId('tags-table').find('input').type(first).type('{enter}');
		cy.contains('Add new').click();
		cy.wait(300);
		cy.getByTestId('tags-table').find('input').type(second).type('{enter}');
		cy.contains('Done').click();

		wf.getters.createTagButton().click();
		wf.getters.tagsInDropdown().should('have.length', 2); // two stored
		wf.getters.tagPills().should('have.length', 0); // none attached
	});

	it('should delete a tag via modal', () => {
		wf.actions.openTagManagerModal();

		const [first] = TEST_TAGS;

		cy.contains('Create a tag').click();
		cy.getByTestId('tags-table').find('input').type(first).type('{enter}');
		cy.getByTestId('delete-tag-button').click({ force: true });
		cy.wait(300);
		cy.contains('Delete tag').click();
		cy.contains('Done').click();
		wf.getters.createTagButton().click();
		wf.getters.tagsInDropdown().should('have.length', 0); // none stored
		wf.getters.tagPills().should('have.length', 0); // none attached
	});

	it('should update a tag via modal', () => {
		wf.actions.openTagManagerModal();

		const [first] = TEST_TAGS;

		cy.contains('Create a tag').click();
		cy.getByTestId('tags-table').find('input').type(first).type('{enter}');
		cy.getByTestId('edit-tag-button').click({ force: true });
		cy.wait(300);
		cy.getByTestId('tags-table')
			.find('.el-input--large')
			.should('be.visible')
			.type(' Updated')
			.type('{enter}');
		cy.contains('Done').click();
		wf.getters.createTagButton().click();
		wf.getters.tagsInDropdown().should('have.length', 1); // one stored
		wf.getters.tagsInDropdown().contains('Updated').should('exist');
		wf.getters.tagPills().should('have.length', 0); // none attached
	});

	it('should detach a tag inline by clicking on X on tag pill', () => {
		wf.getters.createTagButton().click();
		wf.actions.addTags(TEST_TAGS);
		wf.getters.nthTagPill(1).click();
		wf.getters.tagsDropdown().find('.el-tag__close').first().click();
		cy.get('body').type('{enter}');
		wf.getters.tagPills().should('have.length', TEST_TAGS.length - 1);
	});

	it('should detach a tag inline by clicking on dropdown list item', () => {
		wf.getters.createTagButton().click();
		wf.actions.addTags(TEST_TAGS);
		wf.getters.nthTagPill(1).click();
		wf.getters.tagsDropdown().find('li.selected').first().click();
		cy.get('body').type('{enter}');
		wf.getters.tagPills().should('have.length', TEST_TAGS.length - 1);
	});
});
