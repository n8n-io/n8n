import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { useRolesStore } from '@/app/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import RoleAssignmentsTab from './RoleAssignmentsTab.vue';
import type { RoleAssignmentsResponse, RoleProjectAssignment } from '@n8n/api-types';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
			replace: vi.fn(),
		}),
		useRoute: () => ({
			params: {},
			query: {},
		}),
	};
});

const renderComponent = createComponentRenderer(RoleAssignmentsTab);

function createProject(overrides: Partial<RoleProjectAssignment> = {}): RoleProjectAssignment {
	return {
		projectId: 'proj-1',
		projectName: 'My Project',
		projectIcon: null,
		memberCount: 3,
		lastAssigned: '2025-06-15T10:00:00.000Z',
		...overrides,
	};
}

function createAssignmentsResponse(
	projects: RoleProjectAssignment[] = [],
): RoleAssignmentsResponse {
	return { projects, totalProjects: projects.length } as RoleAssignmentsResponse;
}

let rolesStore: MockedStore<typeof useRolesStore>;

describe('RoleAssignmentsTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
	});

	describe('Loading state', () => {
		it('should show loading skeleton while fetching assignments', () => {
			rolesStore.fetchRoleAssignments.mockReturnValue(new Promise(() => {}));

			const { container } = renderComponent({ props: { roleSlug: 'test-role' } });

			expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		});
	});

	describe('Empty state', () => {
		it('should show empty message when no projects are assigned', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse([]));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText('This role is not assigned in any projects yet.')).toBeInTheDocument();
			});
		});
	});

	describe('Project listing', () => {
		const projectAlpha = createProject({
			projectId: 'proj-alpha',
			projectName: 'Alpha Project',
			memberCount: 5,
			lastAssigned: '2025-03-10T12:00:00.000Z',
		});

		const projectBeta = createProject({
			projectId: 'proj-beta',
			projectName: 'Beta Project',
			memberCount: 12,
			lastAssigned: '2025-06-20T08:00:00.000Z',
		});

		const projectGamma = createProject({
			projectId: 'proj-gamma',
			projectName: 'Gamma Project',
			memberCount: 1,
			lastAssigned: null,
		});

		it('should show project names after loading', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(
				createAssignmentsResponse([projectAlpha, projectBeta]),
			);

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText('Alpha Project')).toBeInTheDocument();
				expect(getByText('Beta Project')).toBeInTheDocument();
			});
		});

		it('should show member counts for each project', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(
				createAssignmentsResponse([projectAlpha, projectBeta]),
			);

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText('5')).toBeInTheDocument();
				expect(getByText('12')).toBeInTheDocument();
			});
		});

		it('should show formatted dates for last assigned column', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse([projectAlpha]));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText('Mar 10th, 2025')).toBeInTheDocument();
			});
		});

		it('should show em dash when lastAssigned is null', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse([projectGamma]));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText('\u2014')).toBeInTheDocument();
			});
		});

		it('should show table column headers', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse([projectAlpha]));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText(/^Project/)).toBeInTheDocument();
				expect(getByText(/Members assigned/)).toBeInTheDocument();
				expect(getByText(/Last assigned/)).toBeInTheDocument();
			});
		});
	});

	describe('Sorting', () => {
		const projectLow = createProject({
			projectId: 'proj-low',
			projectName: 'Zebra Project',
			memberCount: 1,
			lastAssigned: '2025-01-01T00:00:00.000Z',
		});

		const projectMid = createProject({
			projectId: 'proj-mid',
			projectName: 'Middle Project',
			memberCount: 5,
			lastAssigned: '2025-06-15T00:00:00.000Z',
		});

		const projectHigh = createProject({
			projectId: 'proj-high',
			projectName: 'Alpha Project',
			memberCount: 10,
			lastAssigned: '2025-12-01T00:00:00.000Z',
		});

		const allProjects = [projectLow, projectMid, projectHigh];

		function getRowTexts(container: Element): string[] {
			const rows = container.querySelectorAll('tbody tr');
			return Array.from(rows).map((row) => {
				const firstCell = row.querySelector('td');
				return firstCell?.textContent?.trim() ?? '';
			});
		}

		it('should default to memberCount descending sort', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { container } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				const rows = getRowTexts(container);
				expect(rows).toEqual(['Alpha Project', 'Middle Project', 'Zebra Project']);
			});
		});

		it('should show descending arrow on memberCount column by default', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				const membersHeader = getByText(/Members assigned/);
				expect(membersHeader.textContent).toContain('\u2193');
			});
		});

		it('should toggle memberCount to ascending when clicking the same column again', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { container, getByText } = renderComponent({
				props: { roleSlug: 'test-role' },
			});

			await waitFor(() => {
				expect(getByText(/Members assigned/)).toBeInTheDocument();
			});

			await userEvent.click(getByText(/Members assigned/));

			await waitFor(() => {
				const rows = getRowTexts(container);
				expect(rows).toEqual(['Zebra Project', 'Middle Project', 'Alpha Project']);
			});
		});

		it('should sort by projectName ascending when clicking project column', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { container, getByText } = renderComponent({
				props: { roleSlug: 'test-role' },
			});

			await waitFor(() => {
				expect(getByText(/^Project/)).toBeInTheDocument();
			});

			await userEvent.click(getByText(/^Project/));

			await waitFor(() => {
				const rows = getRowTexts(container);
				expect(rows).toEqual(['Alpha Project', 'Middle Project', 'Zebra Project']);
			});
		});

		it('should sort by lastAssigned ascending when clicking last assigned column', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { container, getByText } = renderComponent({
				props: { roleSlug: 'test-role' },
			});

			await waitFor(() => {
				expect(getByText(/Last assigned/)).toBeInTheDocument();
			});

			await userEvent.click(getByText(/Last assigned/));

			await waitFor(() => {
				const rows = getRowTexts(container);
				expect(rows).toEqual(['Zebra Project', 'Middle Project', 'Alpha Project']);
			});
		});

		it('should show ascending arrow after switching to a text column', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText(/^Project/)).toBeInTheDocument();
			});

			await userEvent.click(getByText(/^Project/));

			await waitFor(() => {
				const projectHeader = getByText(/^Project/);
				expect(projectHeader.textContent).toContain('\u2191');
			});
		});

		it('should not show sort arrow on inactive columns', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse(allProjects));

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				const projectHeader = getByText(/^Project$/);
				expect(projectHeader.textContent).not.toContain('\u2191');
				expect(projectHeader.textContent).not.toContain('\u2193');
			});
		});
	});

	describe('Member modal', () => {
		it('should open members modal when clicking member count button', async () => {
			const project = createProject({
				projectId: 'proj-1',
				projectName: 'Test Project',
				memberCount: 7,
			});

			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse([project]));
			rolesStore.fetchRoleProjectMembers.mockResolvedValue({ members: [] });

			const { getByText } = renderComponent({ props: { roleSlug: 'test-role' } });

			await waitFor(() => {
				expect(getByText('7')).toBeInTheDocument();
			});

			await userEvent.click(getByText('7'));

			await waitFor(() => {
				expect(rolesStore.fetchRoleProjectMembers).toHaveBeenCalledWith('test-role', 'proj-1');
			});
		});
	});

	describe('Store interaction', () => {
		it('should call fetchRoleAssignments with the provided roleSlug', async () => {
			rolesStore.fetchRoleAssignments.mockResolvedValue(createAssignmentsResponse([]));

			renderComponent({ props: { roleSlug: 'custom-editor' } });

			await waitFor(() => {
				expect(rolesStore.fetchRoleAssignments).toHaveBeenCalledWith('custom-editor');
			});
		});
	});
});
