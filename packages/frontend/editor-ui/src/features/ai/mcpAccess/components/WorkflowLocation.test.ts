import { createComponentRenderer } from '@/__tests__/render';
import WorkflowLocation from '@/features/ai/mcpAccess/components/WorkflowLocation.vue';
import { createHomeProject, createParentFolder } from '@/features/ai/mcpAccess/mcp.test.utils';

vi.mock('@/app/router', () => ({
	default: {
		resolve: vi.fn(({ name, params }) => {
			if (name === 'NodeViewExisting') {
				return { fullPath: `/workflows/${params.name}` };
			}
			if (name === 'ProjectsWorkflows') {
				return { fullPath: `/projects/${params.projectId}` };
			}
			return { fullPath: '/' };
		}),
	},
}));

const createComponent = createComponentRenderer(WorkflowLocation);

describe('WorkflowLocation', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Project rendering', () => {
		it('should render project name for team project', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject({ name: 'My Team Project', type: 'team' }),
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Team Project');
		});

		it('should render "Personal" for personal project type', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject({ name: 'User<user@n8n.io>', type: 'personal' }),
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('Personal');
		});

		it('should not render project when homeProject is not provided', () => {
			const { queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
				},
			});

			expect(queryByTestId('workflow-location-project-name')).not.toBeInTheDocument();
		});
	});

	describe('Folder rendering', () => {
		it('should render folder name when parentFolder is provided', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					parentFolder: createParentFolder({ name: 'My Folder' }),
				},
			});

			expect(getByTestId('workflow-location-folder-name')).toHaveTextContent('My Folder');
		});

		it('should not render folder when parentFolder is not provided', () => {
			const { queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
				},
			});

			expect(queryByTestId('workflow-location-folder-name')).not.toBeInTheDocument();
		});

		it('should render ellipsis when folder has a grandparent folder', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					parentFolder: createParentFolder({ parentFolderId: 'grandparent-folder-id' }),
				},
			});

			expect(getByTestId('workflow-location-grandparent')).toBeVisible();
			expect(getByTestId('workflow-location-ellipsis-separator')).toBeVisible();
		});

		it('should not render ellipsis when folder is in project root', () => {
			const { queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					parentFolder: createParentFolder({ parentFolderId: null }),
				},
			});

			expect(queryByTestId('workflow-location-grandparent')).not.toBeInTheDocument();
		});
	});

	describe('Workflow name rendering', () => {
		it('should render workflow name', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Awesome Workflow',
					homeProject: createHomeProject(),
				},
			});

			expect(getByTestId('workflow-location-workflow-name')).toHaveTextContent(
				'My Awesome Workflow',
			);
		});

		it('should not render workflow name when empty', () => {
			const { queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: '',
					homeProject: createHomeProject(),
				},
			});

			expect(queryByTestId('workflow-location-workflow-name')).not.toBeInTheDocument();
		});
	});

	describe('Separators', () => {
		it('should render separator between project and workflow name', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
				},
			});

			expect(getByTestId('workflow-location-separator')).toBeVisible();
		});

		it('should render separator between project and folder', () => {
			const { getAllByText } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					parentFolder: createParentFolder(),
				},
			});

			// Should have multiple separators (project/folder and folder/workflow)
			const separators = getAllByText('/');
			expect(separators.length).toBeGreaterThanOrEqual(2);
		});

		it('should not render separator when no workflow name or folder', () => {
			const { queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: '',
					homeProject: createHomeProject(),
				},
			});

			expect(queryByTestId('workflow-location-separator')).not.toBeInTheDocument();
		});
	});

	describe('Links rendering (asLinks=true)', () => {
		it('should render project as link when asLinks is true', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject({ id: 'project-123' }),
					asLinks: true,
				},
			});

			const projectLink = getByTestId('workflow-location-project-link');
			expect(projectLink).toBeInTheDocument();
			expect(projectLink).toHaveAttribute('href', '/projects/project-123');
		});

		it('should render folder as link when asLinks is true', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject({ id: 'project-123' }),
					parentFolder: createParentFolder({ id: 'folder-456' }),
					asLinks: true,
				},
			});

			const folderLink = getByTestId('workflow-location-folder-link');
			expect(folderLink).toBeInTheDocument();
			expect(folderLink).toHaveAttribute(
				'href',
				'/projects/project-123/folders/folder-456/workflows',
			);
		});

		it('should render workflow name as link when asLinks is true', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-789',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					asLinks: true,
				},
			});

			const workflowLink = getByTestId('workflow-location-workflow-link');
			expect(workflowLink).toBeInTheDocument();
			expect(workflowLink).toHaveAttribute('href', '/workflows/workflow-789');
		});
	});

	describe('Text rendering (asLinks=false)', () => {
		it('should render project as plain text when asLinks is false', () => {
			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					asLinks: false,
				},
			});

			expect(getByTestId('workflow-location-project-name')).toBeInTheDocument();
			expect(queryByTestId('workflow-location-project-link')).not.toBeInTheDocument();
		});

		it('should render folder as plain text when asLinks is false', () => {
			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					parentFolder: createParentFolder(),
					asLinks: false,
				},
			});

			expect(getByTestId('workflow-location-folder-name')).toBeInTheDocument();
			expect(queryByTestId('workflow-location-folder-link')).not.toBeInTheDocument();
		});

		it('should render workflow name as plain text when asLinks is false', () => {
			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject(),
					asLinks: false,
				},
			});

			expect(getByTestId('workflow-location-workflow-name')).toBeInTheDocument();
			expect(queryByTestId('workflow-location-workflow-link')).not.toBeInTheDocument();
		});
	});

	describe('Full location path rendering', () => {
		it('should render complete path: Project / Folder / Workflow', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject({ name: 'My Project' }),
					parentFolder: createParentFolder({ name: 'My Folder' }),
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Project');
			expect(getByTestId('workflow-location-folder-name')).toHaveTextContent('My Folder');
			expect(getByTestId('workflow-location-workflow-name')).toHaveTextContent('My Workflow');
		});

		it('should render path with ellipsis for nested folder: Project / ... / Folder / Workflow', () => {
			const { getByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: 'My Workflow',
					homeProject: createHomeProject({ name: 'My Project' }),
					parentFolder: createParentFolder({ name: 'Nested Folder', parentFolderId: 'parent-id' }),
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Project');
			expect(getByTestId('workflow-location-grandparent')).toBeVisible();
			expect(getByTestId('workflow-location-folder-name')).toHaveTextContent('Nested Folder');
			expect(getByTestId('workflow-location-workflow-name')).toHaveTextContent('My Workflow');
		});

		it('should render minimal path: Project only', () => {
			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflowId: 'workflow-1',
					workflowName: '',
					homeProject: createHomeProject({ name: 'My Project' }),
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Project');
			expect(queryByTestId('workflow-location-folder-name')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-location-workflow-name')).not.toBeInTheDocument();
		});
	});
});
