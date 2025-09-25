import {
	createFolderFromCardActions,
	createFolderFromListDropdown,
	createFolderFromListHeaderButton,
	createFolderFromProjectHeader,
	createFolderInsideFolder,
	createNewProject,
	createWorkflowFromEmptyState,
	createWorkflowFromListDropdown,
	createWorkflowFromProjectHeader,
	getAddResourceDropdown,
	getCanvasBreadcrumbs,
	getCurrentBreadcrumbText,
	getFolderCard,
	getFolderCardActionItem,
	getFolderCardActionToggle,
	getFolderCards,
	getFolderEmptyState,
	getHomeProjectBreadcrumb,
	getListBreadcrumbs,
	getMainBreadcrumbsEllipsis,
	getMainBreadcrumbsEllipsisMenuItems,
	getNewFolderModalErrorMessage,
	getNewFolderNameInput,
	getOverviewMenuItem,
	getPersonalProjectMenuItem,
	getProjectEmptyState,
	getProjectMenuItem,
	getProjectTab,
	getVisibleListBreadcrumbs,
	getWorkflowCard,
	getWorkflowCardBreadcrumbs,
	getWorkflowCardBreadcrumbsEllipsis,
	getWorkflowCards,
	goToPersonalProject,
} from '../../composables/folders';
import { expandSidebar } from '../../composables/sidebar';
import { visitWorkflowsPage } from '../../composables/workflowsPage';
import { successToast } from '../../pages/notifications';

describe('Folders - Basic Operations', () => {
	before(() => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
		cy.enableFeature('folders');
		cy.enableFeature('advancedPermissions');
		cy.enableFeature('projectRole:admin');
		cy.enableFeature('projectRole:editor');
		cy.changeQuota('maxTeamProjects', -1);
	});

	beforeEach(() => {
		visitWorkflowsPage();
	});

	describe('Create and navigate folders', () => {
		it('should create folder from the project header', () => {
			// 1. In project root
			getPersonalProjectMenuItem().click();
			createFolderFromProjectHeader('My Folder');
			getFolderCards().should('have.length.greaterThan', 0);
			// Clicking on the success toast should navigate to the folder
			successToast().find('a').click();
			getCurrentBreadcrumbText().should('equal', 'My Folder');
			// 2. In a folder
			createFolderFromListHeaderButton('My Folder 2');
			getFolderCard('My Folder 2').should('exist');
		});

		it('should not allow illegal folder names', () => {
			// Validation logic is thoroughly tested in unit tests
			// Here we just make sure everything is working in the full UI
			const ILLEGAL_CHARACTERS_NAME = 'hello[';
			const ONLY_DOTS_NAME = '...';
			const REGULAR_NAME = 'My Folder';

			getPersonalProjectMenuItem().click();
			getAddResourceDropdown().click();
			cy.getByTestId('action-folder').click();
			getNewFolderNameInput().type(ILLEGAL_CHARACTERS_NAME, { delay: 50 });
			getNewFolderModalErrorMessage().should(
				'contain.text',
				'Folder name cannot contain the following characters',
			);
			getNewFolderNameInput().clear();
			getNewFolderNameInput().type(ONLY_DOTS_NAME, { delay: 50 });
			getNewFolderModalErrorMessage().should(
				'contain.text',
				'Folder name cannot contain only dots',
			);
			getNewFolderNameInput().clear();
			getNewFolderModalErrorMessage().should('contain.text', 'Folder name cannot be empty');
			getNewFolderNameInput().type(REGULAR_NAME, { delay: 50 });
			getNewFolderModalErrorMessage().should('not.exist');
		});

		it('should create folder from the list header button', () => {
			goToPersonalProject();
			// First create a folder so list appears
			createFolderFromProjectHeader('Test 2');
			createFolderFromListHeaderButton('My Folder 2');
			getFolderCards().should('have.length.greaterThan', 0);
			// Clicking on the success toast should navigate to the folder
			successToast().contains('My Folder 2').find('a').contains('Open folder').click();
			getCurrentBreadcrumbText().should('equal', 'My Folder 2');
		});

		it('should create folder from the list header dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Created from list dropdown');
			getFolderCard('Created from list dropdown').should('exist');
			getFolderCard('Created from list dropdown').click();
			createFolderFromListDropdown('Child Folder');
			successToast().should('exist');
			getFolderCard('Child Folder').should('exist');
		});

		it('should create folder from the card dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Created from card dropdown');
			getFolderCard('Created from card dropdown').should('exist');
			createFolderFromCardActions('Created from card dropdown', 'Child Folder');
			successToast().should('exist');
			// Should be automatically navigated to the new folder
			getFolderCard('Child Folder').should('exist');
			getCurrentBreadcrumbText().should('equal', 'Created from card dropdown');
		});

		it('should navigate folders using breadcrumbs and dropdown menu', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Navigate Test');
			// Open folder using menu item
			getFolderCardActionToggle('Navigate Test').click();
			getFolderCardActionItem('Navigate Test', 'open').click();
			getCurrentBreadcrumbText().should('equal', 'Navigate Test');
			// Create new child folder and navigate to it
			createFolderFromListHeaderButton('Child Folder');
			getFolderCard('Child Folder').should('exist');
			getFolderCard('Child Folder').click();
			getCurrentBreadcrumbText().should('equal', 'Child Folder');
			// Navigate back to parent folder using breadcrumbs
			getVisibleListBreadcrumbs().contains('Navigate Test').click();
			getCurrentBreadcrumbText().should('equal', 'Navigate Test');
			// Go back to home project using breadcrumbs
			getHomeProjectBreadcrumb().click();
			getListBreadcrumbs().should('not.exist');
		});

		// Creates folders inside folders and also checks breadcrumbs
		it('should create multiple levels of folders', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Multi-level Test');
			createFolderInsideFolder('Child Folder', 'Multi-level Test');
			// One level deep:
			// - Breadcrumbs should only show home project and current folder
			getHomeProjectBreadcrumb().should('exist');
			getCurrentBreadcrumbText().should('equal', 'Multi-level Test');
			getFolderCard('Child Folder').should('exist');

			createFolderInsideFolder('Child Folder 2', 'Child Folder');
			// Two levels deep:
			// - Breadcrumbs should also show parent folder, without hidden ellipsis
			getHomeProjectBreadcrumb().should('exist');
			getCurrentBreadcrumbText().should('equal', 'Child Folder');
			getVisibleListBreadcrumbs().should('have.length', 1);
			getMainBreadcrumbsEllipsis().should('not.exist');

			// Three levels deep:
			// - Breadcrumbs should show parents up to the grandparent folder, with one hidden element
			createFolderInsideFolder('Child Folder 3', 'Child Folder 2');
			getVisibleListBreadcrumbs().should('have.length', 1);
			getMainBreadcrumbsEllipsis().should('exist');
			// Clicking on the ellipsis should show hidden element in main breadcrumbs
			getMainBreadcrumbsEllipsis().click();
			getMainBreadcrumbsEllipsisMenuItems().first().should('contain.text', 'Multi-level Test');
			getMainBreadcrumbsEllipsis().click();
		});

		// Make sure breadcrumbs and folder card show correct info when landing straight on a folder page
		it('should correctly render all elements when landing on a folder page', () => {
			// Create a few levels of folders
			goToPersonalProject();
			createFolderFromProjectHeader('Landing Test');
			createFolderInsideFolder('Child Folder', 'Landing Test');
			createFolderInsideFolder('Child Folder 2', 'Child Folder');
			createFolderInsideFolder('Child Folder 3', 'Child Folder 2');
			// Reload page to simulate landing on a folder page
			cy.reload();
			// Main list breadcrumbs should show home project, parent, grandparent, with one hidden element
			getHomeProjectBreadcrumb().should('exist');
			getCurrentBreadcrumbText().should('equal', 'Child Folder 2');
			getVisibleListBreadcrumbs().should('have.length', 1);
			getVisibleListBreadcrumbs().first().should('contain.text', 'Child Folder');
			getMainBreadcrumbsEllipsis().should('exist');
			getMainBreadcrumbsEllipsis().click();
			getMainBreadcrumbsEllipsisMenuItems().first().should('contain.text', 'Landing Test');
			// Should load child folder card
			getFolderCard('Child Folder 3').should('exist');
		});

		it('should show folders only in projects', () => {
			// No folder cards should be shown in the overview page
			expandSidebar();
			getOverviewMenuItem().click();
			getFolderCards().should('not.exist');
			// Option to create folders should not be available in the dropdown
			getAddResourceDropdown().click();
			cy.getByTestId('action-folder').should('not.exist');

			// In personal, we should see previously created folders
			getPersonalProjectMenuItem().click();
			getAddResourceDropdown().click();
			cy.getByTestId('action-folder').should('exist');
			createFolderFromProjectHeader('Personal Folder');
			getFolderCards().should('exist');
			// Create folder option should not be available on credentials tab
			getProjectTab('ProjectsCredentials').click();
			getAddResourceDropdown().click();
			cy.getByTestId('action-folder').should('not.exist');
		});
	});

	describe('Empty State', () => {
		it('should show project empty state when no folders exist', () => {
			expandSidebar();
			createNewProject('Test empty project', { openAfterCreate: true });
			getProjectEmptyState().should('exist');
		});

		it('should toggle folder empty state correctly', () => {
			expandSidebar();
			createNewProject('Test empty folder', { openAfterCreate: true });
			createFolderFromProjectHeader('My Folder');
			getProjectEmptyState().should('not.exist');
			getFolderCard('My Folder').should('exist');
			getFolderCard('My Folder').click();
			getFolderEmptyState().should('exist');
			// Create a new workflow from the empty state
			createWorkflowFromEmptyState('My Workflow');
			// Toast should inform that the workflow was created in the folder
			successToast().should(
				'contain.text',
				'Workflow successfully created in "Test empty folder", within "My Folder"',
			);
			// Go back to the folder
			getProjectMenuItem('Test empty folder').click();
			getFolderCard('My Folder').should('exist');
			getFolderCard('My Folder').click();
			// Should not show empty state anymore
			getFolderEmptyState().should('not.exist');
			getWorkflowCards().should('have.length.greaterThan', 0);
			// Also when filtering and there are no results, empty state CTA should not show
			cy.getByTestId('resources-list-search').type('non-existing', { delay: 20 });
			getWorkflowCards().should('not.exist');
			getFolderEmptyState().should('not.exist');
			// But there should be a message saying that no results were found
			cy.getByTestId('resources-list-empty').should('exist');
		});
	});

	describe('Create workflows inside folders', () => {
		it('should create workflows in folders in all supported ways', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Workflows go here');
			// 1. From empty state
			getFolderCard('Workflows go here').should('exist').click();
			createWorkflowFromEmptyState('Created from empty state');
			goToPersonalProject();
			getFolderCard('Workflows go here').click();
			getWorkflowCard('Created from empty state').should('exist');
			// 2. From the project header
			createWorkflowFromProjectHeader('Workflows go here', 'Created from project header');
			goToPersonalProject();
			getFolderCard('Workflows go here').click();
			getWorkflowCard('Created from project header').should('exist');
			// 3. From list breadcrumbs
			createWorkflowFromListDropdown('Created from list breadcrumbs');
			goToPersonalProject();
			getFolderCard('Workflows go here').click();
			getWorkflowCard('Created from list breadcrumbs').should('exist');
		});

		it('should show new workflow breadcrumbs correctly', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Workflow breadcrumbs test');
			getFolderCard('Workflow breadcrumbs test').should('exist').click();
			getFolderEmptyState().find('button').contains('Create Workflow').click();
			// Should show breadcrumbs before and after saving new workflow
			getCanvasBreadcrumbs().should('exist');
			getCanvasBreadcrumbs().findChildByTestId('home-project').should('contain.text', 'Personal');
			getCanvasBreadcrumbs().find('li[data-test-id="breadcrumbs-item"]').should('have.length', 1);
			// Save workflow and reload
			cy.getByTestId('workflow-save-button').click();
			cy.reload();
			// Should still show the same breadcrumbs
			getCanvasBreadcrumbs().should('exist');
			getCanvasBreadcrumbs().findChildByTestId('home-project').should('contain.text', 'Personal');
			getCanvasBreadcrumbs().find('li[data-test-id="breadcrumbs-item"]').should('have.length', 1);
		});
	});

	describe('Card breadcrumbs', () => {
		it('should correctly show workflow card breadcrumbs in overview page', () => {
			expandSidebar();
			createNewProject('Test card breadcrumbs', { openAfterCreate: true });
			createFolderFromProjectHeader('Parent Folder');
			createFolderInsideFolder('Child Folder', 'Parent Folder');
			getFolderCard('Child Folder').click();
			createFolderFromListHeaderButton('Child Folder 2');
			getFolderCard('Child Folder 2').click();
			createWorkflowFromEmptyState('Breadcrumbs Test');
			// Go to overview page
			getOverviewMenuItem().click();
			getWorkflowCard('Breadcrumbs Test').should('exist');
			getWorkflowCardBreadcrumbs('Breadcrumbs Test').should('exist');
			getWorkflowCardBreadcrumbsEllipsis('Breadcrumbs Test').should('exist');
			getWorkflowCardBreadcrumbsEllipsis('Breadcrumbs Test').realHover({ position: 'topLeft' });
			cy.get('[role=tooltip]').should('exist');
			cy.get('[role=tooltip]').should(
				'contain.text',
				'Test card breadcrumbs / Parent Folder / Child Folder / Child Folder 2',
			);
		});

		it('should correctly toggle folder and workflow card breadcrumbs in projects and folders', () => {
			expandSidebar();
			createNewProject('Test nested search', { openAfterCreate: true });
			createFolderFromProjectHeader('Parent Folder');
			getFolderCard('Parent Folder').click();
			createWorkflowFromEmptyState('Child - Workflow');
			getProjectMenuItem('Test nested search').click();
			createFolderInsideFolder('Child Folder', 'Parent Folder');
			// Should not show breadcrumbs in the folder if there is no search term
			cy.getByTestId('card-badge').should('not.exist');
			// Back to project root
			getHomeProjectBreadcrumb().click();
			// Should not show breadcrumbs in the project if there is no search term
			cy.getByTestId('card-badge').should('not.exist');
			// Search for something
			cy.getByTestId('resources-list-search').type('child', { delay: 20 });
			// Both folder and workflow from child folder should be in the results - nested search works
			getFolderCards().should('have.length', 1);
			getWorkflowCards().should('have.length', 1);
			// Card badges with breadcrumbs should be shown
			getFolderCard('Child Folder').findChildByTestId('card-badge').should('exist');
			getWorkflowCard('Child - Workflow').findChildByTestId('card-badge').should('exist');
		});
	});
});
