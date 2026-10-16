import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type { SkillListItem } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

import SettingsSkillsView from './SettingsSkillsView.vue';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();
const replace = vi.fn();
const routeQuery: Record<string, string> = {};
const confirmMock = vi.fn().mockResolvedValue('confirm');
const showMessageMock = vi.fn();
const showErrorMock = vi.fn();
const trackMock = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMock, alert: vi.fn(), prompt: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push, replace }),
	useRoute: () => ({ params: {}, query: routeQuery }),
	RouterLink: vi.fn(),
}));

function skill(overrides: Partial<SkillListItem> = {}): SkillListItem {
	return {
		id: 's1',
		name: 'research-search',
		description: 'Find research and cite the evidence.',
		scope: 'instance',
		projectId: null,
		projectName: null,
		projectType: null,
		agentId: null,
		agentName: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 1,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

const renderView = createComponentRenderer(SettingsSkillsView);

let skillsStore: MockedStore<typeof useSkillsStore>;

function setPermissions({
	instance = false,
	projects = [] as Array<Partial<ProjectListItem>>,
}: { instance?: boolean; projects?: Array<Partial<ProjectListItem>> } = {}) {
	mockedStore(useUsersStore).currentUser = mock<IUser>({
		id: 'user-1',
		globalScopes: instance ? ['skill:create'] : [],
	});
	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.personalProject = {
		id: 'personal-1',
		name: 'Me <me@n8n.io>',
		type: 'personal',
		scopes: ['projectSkill:create'],
	} as never;
	projectsStore.myProjects = [
		{ id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal', scopes: ['projectSkill:create'] },
		...projects,
	] as ProjectListItem[];
	projectsStore.getMyProjects.mockResolvedValue(undefined);
}

describe('SettingsSkillsView', () => {
	beforeEach(() => {
		createTestingPinia();
		skillsStore = mockedStore(useSkillsStore);
		skillsStore.loading = false;
		skillsStore.skills = [];
		skillsStore.count = 0;
		setPermissions();
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		window.history.replaceState(null, '');
		push.mockClear();
		replace.mockClear();
		confirmMock.mockClear();
		confirmMock.mockResolvedValue('confirm');
		showMessageMock.mockClear();
		showErrorMock.mockClear();
		trackMock.mockClear();
	});

	it('loads the first page on mount', async () => {
		renderView();
		await new Promise(process.nextTick);

		expect(skillsStore.fetchSkills).toHaveBeenCalledWith({ skip: 0, take: 50 });
	});

	it('shows the empty state when there are no skills', async () => {
		const { findByTestId } = renderView();

		expect(await findByTestId('skills-empty-state')).toHaveTextContent('No skills yet');
	});

	it('reports the visit once, with the total count', async () => {
		skillsStore.fetchSkills.mockImplementation(async () => {
			skillsStore.count = 72;
			return { count: 72, data: [] };
		});

		renderView();
		await new Promise(process.nextTick);

		expect(trackMock).toHaveBeenCalledTimes(1);
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILLS, {
			count: 72,
		});
	});

	it('reports no visit when the load fails', async () => {
		skillsStore.fetchSkills.mockRejectedValueOnce(new Error('offline'));

		renderView();
		await new Promise(process.nextTick);

		expect(trackMock).not.toHaveBeenCalled();
	});

	it('does not show the empty state when the load fails', async () => {
		skillsStore.fetchSkills.mockRejectedValueOnce(new Error('offline'));

		const { queryByTestId } = renderView();
		await new Promise(process.nextTick);

		expect(showErrorMock).toHaveBeenCalled();
		expect(queryByTestId('skills-empty-state')).not.toBeInTheDocument();
	});

	it('searches on the server and shows an empty table, not the empty state, for no matches', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { getByTestId, queryByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.type(getByTestId('skills-search'), 'brand');
		await vi.runAllTimersAsync();

		expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith({
			skip: 0,
			take: 50,
			search: 'brand',
		});
		expect(queryByTestId('skills-empty-state')).not.toBeInTheDocument();
		vi.useRealTimers();
	});

	it('filters by scope on the server', async () => {
		const { getByTestId, findByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('skills-scope-filter'));
		const menu = await findByTestId('skills-scope-filter-menu');
		await userEvent.click(within(menu).getByText('Agents'));

		await waitFor(() =>
			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith({
				skip: 0,
				take: 50,
				scope: 'agent',
			}),
		);
		expect(getByTestId('skills-scope-filter-active')).toBeInTheDocument();
	});

	it('keeps the search and the scope filter in the URL', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.type(getByTestId('skills-search'), 'brand');
		await vi.runAllTimersAsync();

		expect(replace).toHaveBeenLastCalledWith({ query: { search: 'brand' } });
		vi.useRealTimers();
	});

	it('starts from the search and the scope filter in the URL', async () => {
		routeQuery.search = 'brand';
		routeQuery.scope = 'project';

		renderView();
		await new Promise(process.nextTick);

		expect(skillsStore.fetchSkills).toHaveBeenCalledWith({
			skip: 0,
			take: 50,
			search: 'brand',
			scope: 'project',
		});
	});

	it('opens the new skill page with the current filters', async () => {
		routeQuery.search = 'brand';
		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('skills-create-button'));

		expect(push).toHaveBeenCalledWith({
			name: 'SettingsContextSkillNew',
			state: { skillsListQuery: { search: 'brand' } },
		});
	});

	it('hides "Create skill" when the user may not create a skill anywhere', async () => {
		mockedStore(useProjectsStore).personalProject = null;
		mockedStore(useProjectsStore).myProjects = [];
		const { queryByTestId } = renderView();
		await new Promise(process.nextTick);

		expect(queryByTestId('skills-create-button')).not.toBeInTheDocument();
	});

	it('opens the skill page for a row', async () => {
		skillsStore.skills = [skill()];
		skillsStore.count = 1;
		const { getByText } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByText('research-search'));

		expect(push).toHaveBeenCalledWith({
			name: 'SettingsContextSkill',
			params: { skillId: 's1' },
			state: { skillsListQuery: {} },
		});
	});

	it('says so when the search or the filter hides the skill that was just created', async () => {
		window.history.replaceState({ savedSkill: { id: 's-new', created: true } }, '');

		renderView();
		await new Promise(process.nextTick);

		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'Skill created. Your search or filter hides it.',
			type: 'success',
		});
	});

	it('says nothing when the list shows the skill that was just saved', async () => {
		window.history.replaceState({ savedSkill: { id: 's1', created: false } }, '');
		skillsStore.fetchSkills.mockImplementation(async () => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			return { count: 1, data: skillsStore.skills };
		});

		renderView();
		await new Promise(process.nextTick);

		expect(showMessageMock).not.toHaveBeenCalled();
	});

	it('deletes a skill after confirmation', async () => {
		skillsStore.skills = [skill()];
		skillsStore.count = 1;
		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('skill-actions').querySelector('button')!);
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-delete"]')).toBeInTheDocument(),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-delete"]')!);
		await new Promise(process.nextTick);

		expect(confirmMock).toHaveBeenCalled();
		expect(skillsStore.deleteSkill).toHaveBeenCalledWith('s1');
	});

	describe('deep links', () => {
		it('redirects ?skillId to the skill page', async () => {
			routeQuery.skillId = 's9';

			renderView();
			await new Promise(process.nextTick);

			expect(replace).toHaveBeenCalledWith({
				name: 'SettingsContextSkill',
				params: { skillId: 's9' },
			});
			expect(skillsStore.fetchSkills).not.toHaveBeenCalled();
		});

		it('redirects ?create=true to the new skill page', async () => {
			routeQuery.create = 'true';

			renderView();
			await new Promise(process.nextTick);

			expect(replace).toHaveBeenCalledWith({ name: 'SettingsContextSkillNew' });
		});
	});

	it('goes back to the Context overview', async () => {
		const { getByText } = renderView();

		await userEvent.click(getByText('Back to Context'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContext' });
	});
});
