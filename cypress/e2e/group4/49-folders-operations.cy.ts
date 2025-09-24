import {
	createFolderFromProjectHeader,
	createFolderInsideFolder,
	createWorkflowFromProjectHeader,
	deleteAndTransferFolderContentsFromCardDropdown,
	deleteAndTransferFolderContentsFromListDropdown,
	deleteEmptyFolderFromCardDropdown,
	deleteEmptyFolderFromListDropdown,
	deleteFolderWithContentsFromCardDropdown,
	deleteFolderWithContentsFromListDropdown,
	getCurrentBreadcrumbText,
	getFolderCard,
	getFolderCards,
	getFolderEmptyState,
	getHomeProjectBreadcrumb,
	getListBreadcrumbItem,
	getListBreadcrumbs,
	getPersonalProjectMenuItem,
	getWorkflowCard,
	getWorkflowCards,
	goToPersonalProject,
	moveFolderFromFolderCardActions,
	moveFolderFromListActions,
	moveWorkflowToFolder,
	renameFolderFromCardActions,
	renameFolderFromListActions,
} from '../../composables/folders';
import { visitWorkflowsPage } from '../../composables/workflowsPage';
import { successToast } from '../../pages/notifications';

describe('Folders - Operations', () => {
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

	describe('Rename and delete folders', () => {
		it('should rename folder from main dropdown', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Rename Me');
			getFolderCard('Rename Me').should('exist');
			renameFolderFromListActions('Rename Me', 'Renamed');
			getCurrentBreadcrumbText().should('equal', 'Renamed');
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
			getCurrentBreadcrumbText().should('equal', 'Destination 5');
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
			getCurrentBreadcrumbText().should('equal', 'Destination 6');
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
			moveFolderFromFolderCardActions('Move me to root', 'No folder (project root)');
			// Parent folder should be empty
			getFolderEmptyState().should('exist');
			// Child folder should be in the root
			goToPersonalProject();
			getFolderCard('Move me to root').should('exist');
			// Navigate to the moved folder and check breadcrumbs
			getFolderCard('Move me to root').click();
			getHomeProjectBreadcrumb().should('contain.text', 'Personal');
			getListBreadcrumbs().findChildByTestId('breadcrumbs-item').should('not.exist');
			getCurrentBreadcrumbText().should('equal', 'Move me to root');
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
});
