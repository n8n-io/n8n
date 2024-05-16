import { WorkflowPage } from '../pages';

const wf = new WorkflowPage();

const TEST_TAGS = ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4', 'Tag 5'];

describe('Workflow tags', () => {
	beforeEach(() => {
		wf.actions.visit();
	});

	it('should create and attach tags inline', () => {
		wf.getters.createTagButton().click();
		wf.actions.addTags(TEST_TAGS.slice(0, 2));
		wf.getters.tagPills().should('have.length', 2);
		wf.getters.nthTagPill(1).click();
		wf.actions.addTags(TEST_TAGS[1].toUpperCase());
		wf.getters.tagPills().should('have.length', 3);
		wf.getters.isWorkflowSaved();
	});

	it('should create tags via modal', () => {
		wf.actions.openTagManagerModal();

		const tags = TEST_TAGS.slice(3);
		for (const tag of tags) {
			cy.contains('Add new').click();
			cy.getByTestId('tags-table').find('input').type(tag).type('{enter}');
			cy.wait(300);
		}
		cy.contains('Done').click();

		wf.getters.createTagButton().click();
		wf.getters.tagsDropdown().click();
		wf.getters.tagsInDropdown().should('have.length', 5);
		wf.getters.tagPills().should('have.length', 0); // none attached
	});

	it('should delete all tags via modal', () => {
		wf.actions.openTagManagerModal();

		TEST_TAGS.forEach(() => {
			cy.getByTestId('delete-tag-button').first().click({ force: true });
			cy.contains('Delete tag').click();
			cy.wait(300);
		});

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
		cy.getByTestId('tags-table').should('contain.text', first);
		cy.getByTestId('edit-tag-button').eq(-1).click({ force: true });
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
		cy.get('body').click(0, 0);
		wf.getters.workflowTags().click();
		wf.getters.tagPills().should('have.length', TEST_TAGS.length - 1);
	});

	it('should detach a tag inline by clicking on dropdown list item', () => {
		wf.getters.createTagButton().click();
		wf.actions.addTags(TEST_TAGS);
		wf.getters.nthTagPill(1).click();
		wf.getters.tagsInDropdown().filter('.selected').first().click();
		cy.get('body').click(0, 0);
		wf.getters.workflowTags().click();
		wf.getters.tagPills().should('have.length', TEST_TAGS.length - 1);
	});
});
