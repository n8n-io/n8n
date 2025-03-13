import {
	createFolderFromCardActions,
	createFolderFromListDropdown,
	createFolderFromListHeaderButton,
	createFolderFromProjectHeader,
	createFolderInsideFolder,
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
	getHomeProjectBreadcrumb,
	getListBreadcrumbs,
	getMainBreadcrumbsEllipsis,
	getMainBreadcrumbsEllipsisMenuItems,
	getOverviewMenuItem,
	getPersonalProjectMenuItem,
	getVisibleListBreadcrumbs,
	goToPersonalProject,
	renameFolderFromCardActions,
	renameFolderFromListActions,
} from '../composables/folders';
import { visitWorkflowsPage } from '../composables/workflowsPage';
import { successToast } from '../pages/notifications';

describe('Folders', () => {
	before(() => {
		cy.resetDatabase();
		cy.enableFeature('sharing');
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
			createFolderFromProjectHeader('My Folder');
			getFolderCards().should('have.length.greaterThan', 0);
			// Clicking on the success toast should navigate to the folder
			successToast().find('a').click();
			getCurrentBreadcrumb().should('contain.text', 'My Folder');
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
			// Open parent folder to see the new child folder
			getFolderCard('Created from card dropdown').click();
			getFolderCard('Child Folder').should('exist');
		});

		it('should navigate folders using breadcrumbs and dropdown menu', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Navigate Test');
			// Open folder using menu item
			getFolderCardActionToggle('Navigate Test').click();
			getFolderCardActionItem('open').click();
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
			cy.getByTestId('action-folder').should('exist');
			createFolderFromProjectHeader('Personal Folder');
			getFolderCards().should('exist');
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

		// TODO: Once we have backend endpoint that lists project folders, test transfer when deleting
	});
});
