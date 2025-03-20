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
	deleteAndTransferFolderContentsFromCardDropdown,
	deleteAndTransferFolderContentsFromListDropdown,
	deleteEmptyFolderFromCardDropdown,
	deleteEmptyFolderFromListDropdown,
	deleteFolderWithContentsFromCardDropdown,
	deleteFolderWithContentsFromListDropdown,
	getAddResourceDropdown,
	getCurrentBreadcrumb,
	getFolderCard,
	getFolderCardActionItem,
	getFolderCardActionToggle,
	getFolderCards,
	getFolderEmptyState,
	getHomeProjectBreadcrumb,
	getListBreadcrumbItem,
	getListBreadcrumbs,
	getMainBreadcrumbsEllipsis,
	getMainBreadcrumbsEllipsisMenuItems,
	getNewFolderModalErrorMessage,
	getNewFolderNameInput,
	getOverviewMenuItem,
	getPersonalProjectMenuItem,
	getProjectEmptyState,
	getProjectMenuItem,
	getVisibleListBreadcrumbs,
	getWorkflowCard,
	getWorkflowCardBreadcrumbs,
	getWorkflowCardBreadcrumbsEllipsis,
	getWorkflowCards,
	goToPersonalProject,
	moveFolderFromFolderCardActions,
	moveFolderFromListActions,
	moveWorkflowToFolder,
	renameFolderFromCardActions,
	renameFolderFromListActions,
} from '../composables/folders';
import { visitWorkflowsPage } from '../composables/workflowsPage';
import { successToast } from '../pages/notifications';

describe('Folders', () => {
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
			getPersonalProjectMenuItem().click();
			createFolderFromProjectHeader('My Folder');
			getFolderCards().should('have.length.greaterThan', 0);
			// Clicking on the success toast should navigate to the folder
			successToast().find('a').click();
			getCurrentBreadcrumb().should('contain.text', 'My Folder');
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
			getCurrentBreadcrumb().should('contain.text', 'My Folder 2');
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
			getCurrentBreadcrumb().should('contain.text', 'Created from card dropdown');
		});

		it('should navigate folders using breadcrumbs and dropdown menu', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Navigate Test');
			// Open folder using menu item
			getFolderCardActionToggle('Navigate Test').click();
			getFolderCardActionItem('Navigate Test', 'open').click();
			getCurrentBreadcrumb().should('contain.text', 'Navigate Test');
			// Create new child folder and navigate to it
			createFolderFromListHeaderButton('Child Folder');
			getFolderCard('Child Folder').should('exist');
			getFolderCard('Child Folder').click();
			getCurrentBreadcrumb().should('contain.text', 'Child Folder');
			// Navigate back to parent folder using breadcrumbs
			getVisibleListBreadcrumbs().contains('Navigate Test').click();
			getCurrentBreadcrumb().should('contain.text', 'Navigate Test');
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
			getCurrentBreadcrumb().should('contain.text', 'Multi-level Test');
			getFolderCard('Child Folder').should('exist');

			createFolderInsideFolder('Child Folder 2', 'Child Folder');
			// Two levels deep:
			// - Breadcrumbs should also show parent folder, without hidden ellipsis
			getHomeProjectBreadcrumb().should('exist');
			getCurrentBreadcrumb().should('contain.text', 'Child Folder');
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
			getCurrentBreadcrumb().should('contain.text', 'Child Folder 2');
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
		});
	});

	describe('Empty State', () => {
		it('should show project empty state when no folders exist', () => {
			createNewProject('Test empty project', { openAfterCreate: true });
			getProjectEmptyState().should('exist');
		});

		it('should toggle folder empty state correctly', () => {
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
	});

	describe('Rename and delete folders', () => {
		it('should rename folder from main dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Rename Me');
			getFolderCard('Rename Me').should('exist');
			renameFolderFromListActions('Rename Me', 'Renamed');
			getCurrentBreadcrumb().should('contain.text', 'Renamed');
		});

		it('should rename folder from card dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Rename Me 2');
			renameFolderFromCardActions('Rename Me 2', 'Renamed 2');
			getFolderCard('Renamed 2').should('exist');
		});

		it('should delete empty folder from card dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Delete Me');
			getFolderCard('Delete Me').should('exist');
			deleteEmptyFolderFromCardDropdown('Delete Me');
		});

		it('should delete empty folder from main dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Delete Me 2');
			getFolderCard('Delete Me 2').should('exist');
			deleteEmptyFolderFromListDropdown('Delete Me 2');
			// Since we deleted the current folder, we should be back in the home project
			getListBreadcrumbs().should('not.exist');
			getPersonalProjectMenuItem().find('li').should('have.class', 'is-active');
		});

		it('should warn before deleting non-empty folder from list dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('I have children');
			createFolderInsideFolder('Child 1', 'I have children');
			deleteFolderWithContentsFromListDropdown('I have children');
			// Since we deleted the current folder, we should be back in the home project
			getListBreadcrumbs().should('not.exist');
			getPersonalProjectMenuItem().find('li').should('have.class', 'is-active');
		});

		it('should warn before deleting non-empty folder from card dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('I also have family');
			createFolderInsideFolder('Child 1', 'I also have family');
			// Back to home
			getHomeProjectBreadcrumb().click();
			getFolderCard('I also have family').should('exist');
			deleteFolderWithContentsFromCardDropdown('I also have family');
		});

		it('should transfer contents when deleting non-empty folder - from card dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Move my contents');
			createFolderFromProjectHeader('Destination');
			createFolderInsideFolder('Child 1', 'Move my contents');
			getHomeProjectBreadcrumb().click();
			getFolderCard('Move my contents').should('exist');
			deleteAndTransferFolderContentsFromCardDropdown('Move my contents', 'Destination');
			getFolderCard('Destination').click();
			// Should show the contents of the moved folder
			getFolderCard('Child 1').should('exist');
		});

		it('should transfer contents when deleting non-empty folder - from list breadcrumbs', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Move me too');
			createFolderFromProjectHeader('Destination 2');
			createFolderInsideFolder('Child 1', 'Move me too');
			deleteAndTransferFolderContentsFromListDropdown('Destination 2');
			getFolderCard('Destination').click();
			// Should show the contents of the moved folder
			getFolderCard('Child 1').should('exist');
		});
	});

	describe('Move folders and workflows', () => {
		it('should move empty folder to another folder - from folder card action', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Move me - I am empty');
			createFolderFromProjectHeader('Destination 3');
			moveFolderFromFolderCardActions('Move me - I am empty', 'Destination 3');
			getFolderCard('Destination 3').click();
			getFolderCard('Move me - I am empty').should('exist');
			getFolderCard('Move me - I am empty').click();
			getFolderEmptyState().should('exist');
			successToast().should('contain.text', 'Move me - I am empty has been moved to Destination 3');
			// Breadcrumbs should show the destination folder
			getListBreadcrumbItem('Destination 3').should('exist');
		});

		it('should move folder with contents to another folder - from folder card action', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Move me - I have family');
			createFolderFromProjectHeader('Destination 4');
			// Create a workflow and a folder inside the folder
			createFolderInsideFolder('Child 1', 'Move me - I have family');
			createWorkflowFromProjectHeader('Move me - I have family');
			goToPersonalProject();
			// Move the folder
			moveFolderFromFolderCardActions('Move me - I have family', 'Destination 4');
			successToast().should(
				'contain.text',
				'Move me - I have family has been moved to Destination 4',
			);
			// Go to destination folder and check if contents are there
			getFolderCard('Destination 4').click();
			// Moved folder should be there
			getFolderCard('Move me - I have family').should('exist').click();
			// Both the workflow and the folder should be there
			getFolderCards().should('have.length', 1);
			getWorkflowCards().should('have.length', 1);
			// Breadcrumbs should show the destination folder
			getListBreadcrumbItem('Destination 4').should('exist');
		});

		it('should move empty folder to another folder - from list breadcrumbs', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Move me too - I am empty');
			createFolderFromProjectHeader('Destination 5');
			moveFolderFromListActions('Move me too - I am empty', 'Destination 5');
			// Since we moved the current folder, we should be in the destination folder
			getCurrentBreadcrumb().should('contain.text', 'Destination 5');
		});

		it('should move folder with contents to another folder - from list dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Move me - I have family 2');
			createFolderFromProjectHeader('Destination 6');
			// Create a workflow and a folder inside the folder
			createFolderInsideFolder('Child 1', 'Move me - I have family 2');
			createWorkflowFromProjectHeader('Move me - I have family 2');
			// Navigate back to folder
			goToPersonalProject();
			getFolderCard('Move me - I have family 2').should('exist');
			// Move the folder
			moveFolderFromListActions('Move me - I have family 2', 'Destination 6');
			// Since we moved the current folder, we should be in the destination folder
			getCurrentBreadcrumb().should('contain.text', 'Destination 6');
			// Moved folder should be there
			getFolderCard('Move me - I have family 2').should('exist').click();
			// After navigating to the moved folder, both the workflow and the folder should be there
			getFolderCards().should('have.length', 1);
			getWorkflowCards().should('have.length', 1);
			// Breadcrumbs should show the destination folder
			getListBreadcrumbItem('Destination 6').should('exist');
		});

		it('should move folder to project root - from folder card action', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Test parent');
			createFolderInsideFolder('Move me to root', 'Test parent');
			moveFolderFromFolderCardActions('Move me to root', 'Personal');
			// Parent folder should be empty
			getFolderEmptyState().should('exist');
			// Child folder should be in the root
			goToPersonalProject();
			getFolderCard('Move me to root').should('exist');
			// Navigate to the moved folder and check breadcrumbs
			getFolderCard('Move me to root').click();
			getHomeProjectBreadcrumb().should('contain.text', 'Personal');
			getListBreadcrumbs().findChildByTestId('breadcrumbs-item').should('not.exist');
			getCurrentBreadcrumb().should('contain.text', 'Move me to root');
		});

		it('should move workflow from project root to folder', () => {
			goToPersonalProject();
			createWorkflowFromProjectHeader(undefined, 'Move me');
			goToPersonalProject();
			createFolderFromProjectHeader('Workflow destination');
			moveWorkflowToFolder('Move me', 'Workflow destination');
			successToast().should('contain.text', 'Move me has been moved to Workflow destination');
			// Navigate to the destination folder
			getFolderCard('Workflow destination').click();
			// Moved workflow should be there
			getWorkflowCards().should('have.length', 1);
			getWorkflowCard('Move me').should('exist');
		});

		it('should move workflow to another folder', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Moving workflow from here');
			createFolderFromProjectHeader('Moving workflow to here');
			getFolderCard('Moving workflow from here').click();
			createWorkflowFromProjectHeader(undefined, 'Move me');
			goToPersonalProject();
			getFolderCard('Moving workflow from here').click();
			getWorkflowCard('Move me').should('exist');
			moveWorkflowToFolder('Move me', 'Moving workflow to here');
			// Now folder should be empty
			getFolderEmptyState().should('exist');
			// Navigate to the destination folder
			getHomeProjectBreadcrumb().click();
			getFolderCard('Moving workflow to here').click();
			// Moved workflow should be there
			getWorkflowCards().should('have.length', 1);
			getWorkflowCard('Move me').should('exist');
		});
	});

	describe('Workflow card breadcrumbs', () => {
		it('should correctly show workflow card breadcrumbs', () => {
			createNewProject('Test workflow breadcrumbs', { openAfterCreate: true });
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
				'est workflow breadcrumbs / Parent Folder / Child Folder / Child Folder 2',
			);
		});
	});
});
