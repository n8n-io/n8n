import { WorkflowPage } from '../pages';
import { getVisibleSelect } from '../utils';

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
		wf.actions.addTags(TEST_TAGS[2]);
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
		wf.getters.workflowTagsContainer().click();
		wf.getters.tagsInDropdown().filter('.selected').first().click();
		cy.get('body').click(0, 0);
		wf.getters.workflowTags().click();
		wf.getters.tagPills().should('have.length', TEST_TAGS.length - 1);
	});

	it('should not show non existing tag as a selectable option', () => {
		const NON_EXISTING_TAG = 'My Test Tag';

		wf.getters.createTagButton().click();
		wf.actions.addTags(TEST_TAGS);
		cy.get('body').click(0, 0);
		wf.getters.workflowTags().click();
		wf.getters.workflowTagsInput().type(NON_EXISTING_TAG);

		getVisibleSelect()
			.find('li')
			.should('have.length', 2)
			.filter(`:contains("${NON_EXISTING_TAG}")`)
			.should('not.have.length');
	});
});
