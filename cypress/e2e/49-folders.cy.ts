import {
	createFolderFromCardActions,
	createFolderFromListDropdown,
	createFolderFromListHeaderButton,
	createFolderFromProjectHeader,
	createFolderInsideFolder,
	getAddResourceDropdown,
	getCurrentBreadcrumb,
	getFolderCard,
	getFolderCardActionItem,
	getFolderCardActionToggle,
	getFolderCardBreadCrumbsEllipsis,
	getFolderCardCurrentBreadcrumb,
	getFolderCardHomeProjectBreadcrumb,
	getFolderCards,
	getHomeProjectBreadcrumb,
	getListBreadcrumbs,
	getMainBreadcrumbsEllipsis,
	getMainBreadcrumbsEllipsisMenuItems,
	getOpenHiddenItemsTooltip,
	getOverviewMenuItem,
	getPersonalProjectMenuItem,
	getVisibleListBreadcrumbs,
	goToPersonalProject,
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
			successToast().find('a').contains('My Folder 2').click();
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
			// - Both main breadcrumbs & card breadcrumbs should only show home project and current folder
			getHomeProjectBreadcrumb().should('exist');
			getCurrentBreadcrumb().should('contain.text', 'Multi-level Test');
			getFolderCard('Child Folder').should('exist');
			getFolderCardHomeProjectBreadcrumb('Child Folder').should('exist');
			getFolderCardCurrentBreadcrumb('Child Folder').should('contain.text', 'Multi-level Test');
			// No hidden items at this level
			getFolderCardBreadCrumbsEllipsis('Child Folder').should('not.exist');

			createFolderInsideFolder('Child Folder 2', 'Child Folder');
			// Two levels deep:
			// - Main breadcrumbs should also show parent folder, without hidden ellipsis
			// - Card breadcrumbs should show home project, parent folder, with hidden ellipsis
			getHomeProjectBreadcrumb().should('exist');
			getCurrentBreadcrumb().should('contain.text', 'Child Folder');
			getVisibleListBreadcrumbs().should('have.length', 1);
			getMainBreadcrumbsEllipsis().should('not.exist');
			getFolderCardCurrentBreadcrumb('Child Folder 2').should('contain.text', 'Child Folder');
			getFolderCardBreadCrumbsEllipsis('Child Folder 2').should('exist');

			// Three levels deep:
			// - Main breadcrumbs should show parents up to the grandparent folder, with one hidden element
			// - Card breadcrumbs should now show two hidden elements
			createFolderInsideFolder('Child Folder 3', 'Child Folder 2');
			getVisibleListBreadcrumbs().should('have.length', 1);
			getMainBreadcrumbsEllipsis().should('exist');
			// Clicking on the ellipsis should show hidden element in main breadcrumbs
			getMainBreadcrumbsEllipsis().click();
			getMainBreadcrumbsEllipsisMenuItems().first().should('contain.text', 'Multi-level Test');
			getMainBreadcrumbsEllipsis().click();
			// Card breadcrumbs should show two hidden elements
			getFolderCardBreadCrumbsEllipsis('Child Folder 3').should('exist');
			// Clicking on the ellipsis should show hidden element in card breadcrumbs
			getFolderCardBreadCrumbsEllipsis('Child Folder 3').click();
			getOpenHiddenItemsTooltip().should('be.visible');
			getOpenHiddenItemsTooltip().should('contain.text', 'Multi-level Test / Child Folder');
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

		// TO TEST:
		// - Rename folder from main dropdown
		// - Rename folder from card dropdown
		// - Delete folder from main dropdown
		// - Delete folder from card dropdown
	});
});
