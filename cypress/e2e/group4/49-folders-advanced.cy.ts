import {
	createFolderFromProjectHeader,
	createFolderInsideFolder,
	createNewProject,
	createWorkflowFromProjectHeader,
	dragAndDropToFolder,
	dragAndDropToProjectRoot,
	duplicateWorkflowFromCardActions,
	duplicateWorkflowFromWorkflowPage,
	getFolderCard,
	getFolderCards,
	getOverviewMenuItem,
	getProjectMenuItem,
	getWorkflowCard,
	getWorkflowCards,
	goToPersonalProject,
} from '../../composables/folders';
import { expandSidebar } from '../../composables/sidebar';
import { visitWorkflowsPage } from '../../composables/workflowsPage';
import { successToast } from '../../pages/notifications';

describe('Folders - Advanced Interactions', () => {
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

	describe('Duplicate workflows', () => {
		beforeEach(() => {
			// Prevent the duplicated workflow from opening in a new tab
			cy.window().then((win) => {
				cy.stub(win, 'open').as('open');
			});
		});

		it('should duplicate workflow within root folder from personal projects', () => {
			goToPersonalProject();
			createWorkflowFromProjectHeader(undefined, 'Duplicate Me From Root');
			goToPersonalProject();
			duplicateWorkflowFromCardActions('Duplicate Me From Root', 'Duplicate Me From Root (Copy)');
			getWorkflowCard('Duplicate Me From Root (Copy)').should('exist');
		});

		it('should duplicate workflow within a folder from personal projects', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Parent folder for duplication');
			getFolderCard('Parent folder for duplication').click();
			createWorkflowFromProjectHeader(
				'Parent folder for duplication',
				'Duplicate Me From Personal',
			);
			goToPersonalProject();
			getFolderCard('Parent folder for duplication').click();
			duplicateWorkflowFromCardActions(
				'Duplicate Me From Personal',
				'Duplicate Me From Personal (Copy)',
			);
			getWorkflowCard('Duplicate Me From Personal (Copy)').should('exist');
		});

		it('should duplicate workflow within a folder from overview', () => {
			expandSidebar();
			goToPersonalProject();
			getFolderCard('Parent folder for duplication').click();
			createWorkflowFromProjectHeader(
				'Parent folder for duplication',
				'Duplicate Me From Overview',
			);
			getOverviewMenuItem().click();
			duplicateWorkflowFromCardActions(
				'Duplicate Me From Overview',
				'Duplicate Me From Overview (Copy)',
			);
			getWorkflowCard('Duplicate Me From Overview (Copy)').should('exist');
			goToPersonalProject();
			getFolderCard('Parent folder for duplication').click();
			getWorkflowCard('Duplicate Me From Overview (Copy)').should('exist');
		});

		it('should duplicate workflow within a folder from workflow', () => {
			goToPersonalProject();
			createFolderFromProjectHeader('Parent folder for duplication');
			getFolderCard('Parent folder for duplication').click();
			createWorkflowFromProjectHeader(
				'Parent folder for duplication',
				'Duplicate Me From Workflow',
			);
			duplicateWorkflowFromWorkflowPage('Duplicate Me From Workflow (Copy)');
			goToPersonalProject();
			getFolderCard('Parent folder for duplication').click();
			getWorkflowCard('Duplicate Me From Workflow (Copy)').should('exist');
		});
	});

	describe('Drag and drop', () => {
		it('should drag and drop folders into folders', () => {
			const PROJECT_NAME = 'Drag and Drop Test';
			const TARGET_NAME = 'Drag me';
			const DESTINATION_NAME = 'Folder Destination';

			expandSidebar();
			createNewProject(PROJECT_NAME, { openAfterCreate: true });
			createFolderFromProjectHeader(TARGET_NAME);
			createFolderFromProjectHeader(DESTINATION_NAME);

			dragAndDropToFolder(TARGET_NAME, DESTINATION_NAME);
			successToast().should('contain.text', `${TARGET_NAME} has been moved to ${DESTINATION_NAME}`);
			// Only one folder card should remain
			getFolderCards().should('have.length', 1);
			// Check folder in the destination
			getFolderCard(DESTINATION_NAME).click();
			getFolderCard(TARGET_NAME).should('exist');
		});

		it('should drag and drop folders into project root breadcrumb', () => {
			const PROJECT_NAME = 'Drag to root test';
			const TARGET_NAME = 'To Project root';
			const PARENT_NAME = 'Parent Folder';

			expandSidebar();
			createNewProject(PROJECT_NAME, { openAfterCreate: true });
			createFolderFromProjectHeader(PARENT_NAME);
			createFolderInsideFolder(TARGET_NAME, PARENT_NAME);

			dragAndDropToProjectRoot(TARGET_NAME);

			// No folder cards should be shown in the parent folder
			getFolderCards().should('not.exist');
			successToast().should('contain.text', `${TARGET_NAME} has been moved to ${PROJECT_NAME}`);
			// Check folder in the project root
			getProjectMenuItem(PROJECT_NAME).click();
			getFolderCard(TARGET_NAME).should('exist');
		});

		it('should drag and drop workflows into folders', () => {
			const PROJECT_NAME = 'Drag and Drop WF Test';
			const TARGET_NAME = 'Drag me - WF';
			const DESTINATION_NAME = 'Workflow Destination';

			expandSidebar();
			createNewProject(PROJECT_NAME, { openAfterCreate: true });
			createFolderFromProjectHeader(DESTINATION_NAME);
			createWorkflowFromProjectHeader(undefined, TARGET_NAME);
			getProjectMenuItem(PROJECT_NAME).click();
			dragAndDropToFolder(TARGET_NAME, DESTINATION_NAME);
			// No workflow cards should be shown in the project root
			getWorkflowCards().should('not.exist');
			successToast().should('contain.text', `${TARGET_NAME} has been moved to ${DESTINATION_NAME}`);
			// Check workflow in the destination
			getFolderCard(DESTINATION_NAME).click();
			getWorkflowCard(TARGET_NAME).should('exist');
		});
	});
});
