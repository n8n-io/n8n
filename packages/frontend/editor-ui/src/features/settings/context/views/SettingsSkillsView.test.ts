import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type { SkillDetail, SkillListItem } from '@n8n/api-types';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import { useUIStore } from '@/app/stores/ui.store';
import type { AgentSkillModalData } from '@/features/agents/components/AgentSkillModal.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

import SettingsSkillsView from './SettingsSkillsView.vue';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();
const routeQuery: Record<string, string> = {};
const confirmMock = vi.fn().mockResolvedValue('confirm');
const showMessageMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMock, alert: vi.fn(), prompt: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
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
		agentId: null,
		agentName: null,
		source: 'ui',
		latestVersion: 1,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

function detail(overrides: Partial<SkillDetail> = {}): SkillDetail {
	return {
		...skill(),
		skill: {
			name: 'research-search',
			description: 'Find research and cite the evidence.',
			instructions: 'Cite every source.',
		},
		skillHash: 'hash-1',
		usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
		...overrides,
	};
}

const renderView = createComponentRenderer(SettingsSkillsView);

let skillsStore: MockedStore<typeof useSkillsStore>;
let uiStore: MockedStore<typeof useUIStore>;

/** The data the page handed to the skill modal on its last open. */
function lastModalData(): AgentSkillModalData {
	const call = uiStore.openModalWithData.mock.calls.at(-1);
	if (!call) throw new Error('The modal was not opened');
	return call[0].data as AgentSkillModalData;
}

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
		uiStore = mockedStore(useUIStore);
		setPermissions();
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		push.mockClear();
		confirmMock.mockClear();
		confirmMock.mockResolvedValue('confirm');
		showMessageMock.mockClear();
		showErrorMock.mockClear();
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

	describe('create', () => {
		it('offers the personal project and the team projects the user can write to', async () => {
			setPermissions({
				projects: [
					{ id: 'team-1', name: 'Marketing', type: 'team', scopes: ['projectSkill:create'] },
					{ id: 'team-2', name: 'Read only', type: 'team', scopes: ['projectSkill:read'] },
				],
			});
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByTestId('skills-create-button'));

			expect(lastModalData().scopeOptions).toEqual([
				{ value: 'project:personal-1', label: 'Personal project' },
				{ value: 'project:team-1', label: 'Marketing' },
			]);
		});

		it('offers Global only to users who may create instance skills', async () => {
			setPermissions({ instance: true });
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByTestId('skills-create-button'));

			expect(lastModalData().scopeOptions?.[0]).toEqual({ value: 'instance', label: 'Global' });
		});

		it('creates the skill in the chosen scope', async () => {
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByTestId('skills-create-button'));

			const content = {
				name: 'brand-voice',
				description: 'Write copy.',
				instructions: 'Be brief.',
			};
			lastModalData().onConfirm({ skill: content, scope: 'project:personal-1' });
			await new Promise(process.nextTick);

			expect(skillsStore.createSkill).toHaveBeenCalledWith({
				scope: 'project',
				projectId: 'personal-1',
				skill: content,
			});
		});
	});

	describe('edit', () => {
		it('opens a skill read-only when the user cannot change it', async () => {
			skillsStore.skills = [skill({ canEdit: false })];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail({ canEdit: false }));
			const { getByText } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);

			expect(lastModalData().readOnly).toBe(true);
		});

		it('says "Nothing to save" when the content matches the latest version', async () => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail());
			skillsStore.saveSkill.mockResolvedValue({
				id: 's1',
				versionId: 'v1',
				version: 1,
				created: false,
				skill: detail().skill,
				skillHash: 'hash-1',
			});
			const { getByText } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);

			lastModalData().onConfirm({ id: 's1', skill: detail().skill });
			await new Promise(process.nextTick);

			expect(skillsStore.saveSkill).toHaveBeenCalledWith('s1', {
				...detail().skill,
				references: [],
				baseSkillHash: 'hash-1',
			});
			expect(showMessageMock).toHaveBeenCalledWith({ title: 'Nothing to save', type: 'info' });
		});
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
		it('opens the skill named by ?skillId', async () => {
			routeQuery.skillId = 's9';
			skillsStore.fetchSkill.mockResolvedValue(detail({ id: 's9' }));

			renderView();
			await waitFor(() => expect(uiStore.openModalWithData).toHaveBeenCalled());

			expect(skillsStore.fetchSkill).toHaveBeenCalledWith('s9');
			expect(lastModalData().skillId).toBe('s9');
		});

		it('starts a new skill for ?create=true', async () => {
			routeQuery.create = 'true';

			renderView();
			await waitFor(() => expect(uiStore.openModalWithData).toHaveBeenCalled());

			expect(lastModalData().skillId).toBeUndefined();
			expect(lastModalData().scopeOptions).not.toHaveLength(0);
		});
	});

	it('goes back to the Context overview', async () => {
		const { getByText } = renderView();

		await userEvent.click(getByText('Back to Context'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContext' });
	});
});
