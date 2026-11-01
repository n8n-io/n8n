import { usePostHog } from '@/app/stores/posthog.store';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import {
	SKILL_NAME_TAKEN_MESSAGE,
	SKILL_SYNC_FLAG,
	type SkillDetail,
	type SkillListItem,
	type SkillUserDto,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import { getDropdownItems } from '@/__tests__/utils';
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
const trackMock = vi.fn();
const saveAsMock = vi.fn();

vi.mock('file-saver', () => ({ saveAs: (...args: unknown[]) => saveAsMock(...args) }));

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
		projectType: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 1,
		availableToAssistant: false,
		usedByAgents: 0,
		availableToMCP: false,
		canEdit: true,
		canDelete: true,
		canStopSyncing: false,
		syncState: null,
		canCheckForUpdates: false,
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
		syncedFrom: null,
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
		trackMock.mockClear();
		saveAsMock.mockClear();
		skillsStore.fetchAgents.mockResolvedValue([{ id: 'agent-1', name: 'Support bot' }]);
		skillsStore.fetchCreators.mockResolvedValue([
			{ id: 'user-2', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
		]);
	});

	/** Opens the filters popover and picks an option of one filter. */
	async function pickFilter(
		view: ReturnType<typeof renderView>,
		testId: string,
		optionText: string,
	) {
		if (!view.queryByTestId('resources-list-filters-dropdown')) {
			await userEvent.click(view.getByTestId('resources-list-filters-trigger'));
		}
		const items = await getDropdownItems(await view.findByTestId(testId));
		const option = [...items].find((item) => item.textContent?.trim() === optionText);
		if (!option) throw new Error(`No option ${optionText}`);
		await userEvent.click(option);
	}

	it('loads the first page of 10 skills on mount', async () => {
		renderView();
		await new Promise(process.nextTick);

		expect(skillsStore.fetchSkills).toHaveBeenCalledWith({
			skip: 0,
			take: 10,
			sortBy: 'updatedAt:desc',
		});
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

	describe('search', () => {
		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('searches on the server and says when nothing matches', async () => {
			const { getByTestId, findByTestId, queryByTestId } = renderView();
			await new Promise(process.nextTick);

			await userEvent.type(getByTestId('skills-search'), 'brand');
			await vi.runAllTimersAsync();

			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith({
				skip: 0,
				take: 10,
				search: 'brand',
				sortBy: 'updatedAt:desc',
			});
			expect(await findByTestId('skills-no-results')).toHaveTextContent(
				'No skills match your search or filter',
			);
			expect(queryByTestId('skills-empty-state')).not.toBeInTheDocument();
		});

		it('keeps the no-results state, not "No skills yet", while a cleared search reloads', async () => {
			const { getByTestId, findByTestId, queryByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.type(getByTestId('skills-search'), 'brand');
			await vi.runAllTimersAsync();
			await findByTestId('skills-no-results');

			const pending = Promise.withResolvers<{ count: number; data: SkillListItem[] }>();
			skillsStore.fetchSkills.mockReturnValueOnce(pending.promise);
			await userEvent.clear(getByTestId('skills-search'));
			await vi.runAllTimersAsync();

			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith({
				skip: 0,
				take: 10,
				sortBy: 'updatedAt:desc',
			});
			expect(queryByTestId('skills-empty-state')).not.toBeInTheDocument();
			expect(getByTestId('skills-no-results')).toBeInTheDocument();

			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			pending.resolve({ count: 1, data: skillsStore.skills });
			await waitFor(() => expect(queryByTestId('skills-no-results')).not.toBeInTheDocument());
			expect(queryByTestId('skills-empty-state')).not.toBeInTheDocument();
			expect(getByTestId('skill-name')).toHaveTextContent('research-search');
		});

		it('keeps the previous rows instead of the loading rows while a search reloads', async () => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			const { getByTestId, container } = renderView();
			await new Promise(process.nextTick);

			skillsStore.fetchSkills.mockImplementationOnce(async () => {
				skillsStore.loading = true;
				return await new Promise(() => {});
			});
			await userEvent.type(getByTestId('skills-search'), 'res');
			await vi.runAllTimersAsync();

			expect(getByTestId('skill-name')).toHaveTextContent('research-search');
			expect(container.querySelector('.table--loading')).not.toBeInTheDocument();
		});

		it('ignores a slower earlier search that ends after a newer one', async () => {
			const { getByTestId, findByTestId } = renderView();
			await new Promise(process.nextTick);

			const stale = Promise.withResolvers<never>();
			skillsStore.fetchSkills.mockReturnValueOnce(stale.promise);
			await userEvent.type(getByTestId('skills-search'), 'brand');
			await vi.runAllTimersAsync();
			await userEvent.clear(getByTestId('skills-search'));
			await vi.runAllTimersAsync();
			expect(await findByTestId('skills-empty-state')).toBeInTheDocument();

			stale.reject(new Error('offline'));
			await new Promise(process.nextTick);

			expect(showErrorMock).not.toHaveBeenCalled();
			expect(getByTestId('skills-empty-state')).toBeInTheDocument();
		});
	});

	it('filters by scope on the server and counts the filter', async () => {
		const view = renderView();
		await new Promise(process.nextTick);

		await pickFilter(view, 'skills-filter-scope', 'Projects');

		await waitFor(() =>
			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith({
				skip: 0,
				take: 10,
				scope: 'project',
				sortBy: 'updatedAt:desc',
			}),
		);
		expect(view.getByTestId('resources-list-filters-count')).toHaveTextContent('1');
	});

	it('offers only the scope kinds in the scope filter, not single projects', async () => {
		setPermissions({ projects: [{ id: 'team-1', name: 'Marketing', type: 'team', scopes: [] }] });
		const view = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(view.getByTestId('resources-list-filters-trigger'));
		const items = await getDropdownItems(await view.findByTestId('skills-filter-scope'));

		expect([...items].map((item) => item.textContent?.trim())).toEqual(['Global', 'Projects']);
	});

	it('combines the agent and creator filters with the search, from the first page', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const view = renderView();
		await new Promise(process.nextTick);

		await userEvent.type(view.getByTestId('skills-search'), 'voice');
		await vi.runAllTimersAsync();
		await pickFilter(view, 'skills-filter-agent', 'Support bot');
		await pickFilter(view, 'skills-filter-created-by', 'Ada Lovelace');

		await waitFor(() =>
			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith({
				skip: 0,
				take: 10,
				search: 'voice',
				agentId: 'agent-1',
				createdById: 'user-2',
				sortBy: 'updatedAt:desc',
			}),
		);
		expect(skillsStore.fetchAgents).toHaveBeenCalledWith({});
		expect(view.getByTestId('resources-list-filters-count')).toHaveTextContent('2');
		vi.useRealTimers();
	});

	it.each([
		['skills-filter-scope', 'Projects'],
		['skills-filter-agent', 'Support bot'],
		['skills-filter-created-by', 'Ada Lovelace'],
	])(
		'says no skills match, not "No skills yet", when %s matches nothing',
		async (testId, option) => {
			const view = renderView();
			await new Promise(process.nextTick);
			expect(await view.findByTestId('skills-empty-state')).toBeInTheDocument();

			await pickFilter(view, testId, option);

			expect(await view.findByTestId('skills-no-results')).toBeInTheDocument();
			expect(view.queryByTestId('skills-empty-state')).not.toBeInTheDocument();
		},
	);

	it('searches agents on the server for the agent filter', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const view = renderView();
		await new Promise(process.nextTick);
		await userEvent.click(view.getByTestId('resources-list-filters-trigger'));
		const select = await view.findByTestId('skills-filter-agent');

		await userEvent.type(within(select).getByRole('combobox'), 'sup');
		await vi.runAllTimersAsync();

		expect(skillsStore.fetchAgents).toHaveBeenLastCalledWith({ search: 'sup' });
		vi.useRealTimers();
	});

	it('keeps the name of the picked agent when a later search leaves it out', async () => {
		const view = renderView();
		await new Promise(process.nextTick);
		await pickFilter(view, 'skills-filter-agent', 'Support bot');

		skillsStore.fetchAgents.mockResolvedValue([{ id: 'agent-2', name: 'Sales bot' }]);
		vi.useFakeTimers({ shouldAdvanceTime: true });
		await userEvent.type(
			within(view.getByTestId('skills-filter-agent')).getByRole('combobox'),
			'sal',
		);
		await vi.runAllTimersAsync();
		vi.useRealTimers();

		// The dropdown is still open from the search, so read its options directly.
		const trigger = view
			.getByTestId('skills-filter-agent')
			.querySelector('.select-trigger[aria-describedby]');
		const dropdown = document.getElementById(trigger?.getAttribute('aria-describedby') ?? '');
		await waitFor(() =>
			expect(
				[...(dropdown?.querySelectorAll('.el-select-dropdown__item') ?? [])].map((item) =>
					item.textContent?.trim(),
				),
			).toEqual(['Support bot', 'Sales bot']),
		);
		expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith(
			expect.objectContaining({ agentId: 'agent-1' }),
		);
	});

	it('still loads the list when the filter options fail to load', async () => {
		skillsStore.fetchAgents.mockRejectedValue(new Error('offline'));
		skillsStore.fetchCreators.mockRejectedValue(new Error('offline'));

		renderView();
		await new Promise(process.nextTick);

		expect(skillsStore.fetchSkills).toHaveBeenCalled();
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('sorts on the server and turns the order around instead of clearing it', async () => {
		skillsStore.skills = [skill()];
		skillsStore.count = 1;
		const { container } = renderView();
		await new Promise(process.nextTick);
		const header = (title: string) =>
			[...container.querySelectorAll('thead th')].find((th) => th.textContent?.includes(title))!;

		await userEvent.click(header('Skill'));
		await waitFor(() =>
			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith(
				expect.objectContaining({ sortBy: 'name:asc' }),
			),
		);
		await userEvent.click(header('Skill'));
		await waitFor(() =>
			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith(
				expect.objectContaining({ sortBy: 'name:desc' }),
			),
		);
		await userEvent.click(header('Skill'));
		await waitFor(() =>
			expect(skillsStore.fetchSkills).toHaveBeenLastCalledWith(
				expect.objectContaining({ sortBy: 'name:asc' }),
			),
		);
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
				{
					value: 'project:personal-1',
					label: 'Personal project',
					icon: 'user',
					target: { projectId: 'personal-1' },
				},
				{
					value: 'project:team-1',
					label: 'Marketing',
					icon: 'layers',
					target: { projectId: 'team-1' },
				},
			]);
		});

		it('offers Global only to users who may create instance skills', async () => {
			setPermissions({ instance: true });
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByTestId('skills-create-button'));

			expect(lastModalData().scopeOptions?.[0]).toEqual({
				value: 'instance',
				label: 'Global',
				icon: 'globe',
				target: { projectId: null },
			});
		});

		it('asks for a free default name in the scope the user picks', async () => {
			skillsStore.fetchNewSkillName.mockResolvedValue('New skill 2');
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByTestId('skills-create-button'));

			const name = await lastModalData().getDefaultName?.('project:personal-1');

			expect(name).toBe('New skill 2');
			expect(skillsStore.fetchNewSkillName).toHaveBeenCalledWith({
				scope: 'project',
				projectId: 'personal-1',
				name: 'New skill',
			});
		});

		it('creates the skill in the chosen scope', async () => {
			skillsStore.createSkill.mockResolvedValue(detail({ id: 's-new' }));
			// The reloaded list holds the new skill.
			skillsStore.fetchSkills.mockImplementation(async () => {
				skillsStore.skills = [skill({ id: 's-new' })];
				skillsStore.count = 1;
				return { count: 1, data: skillsStore.skills };
			});
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByTestId('skills-create-button'));

			const content = {
				name: 'brand-voice',
				description: 'Write copy.',
				instructions: 'Be brief.',
			};
			lastModalData().onConfirm({
				skill: content,
				scope: 'project:personal-1',
				method: 'upload',
			});
			await new Promise(process.nextTick);

			expect(skillsStore.createSkill).toHaveBeenCalledWith({
				scope: 'project',
				projectId: 'personal-1',
				skill: content,
				method: 'upload',
			});
			// The new row is the feedback, as on the preferences page.
			expect(showMessageMock).not.toHaveBeenCalled();
		});

		it('keeps the refreshed creators when a slower earlier read answers last', async () => {
			const first = Promise.withResolvers<SkillUserDto[]>();
			skillsStore.fetchCreators.mockReturnValueOnce(first.promise);
			skillsStore.createSkill.mockResolvedValue(detail({ id: 's-new' }));
			const view = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(view.getByTestId('skills-create-button'));
			lastModalData().onConfirm({
				skill: { name: 'brand-voice', description: 'Write copy.', instructions: 'Be brief.' },
				scope: 'project:personal-1',
			});
			await new Promise(process.nextTick);

			first.resolve([{ id: 'user-3', email: 'old@example.com', firstName: 'Old', lastName: null }]);
			await new Promise(process.nextTick);

			await userEvent.click(view.getByTestId('resources-list-filters-trigger'));
			const items = await getDropdownItems(await view.findByTestId('skills-filter-created-by'));
			expect([...items].map((item) => item.textContent?.trim())).toEqual(['Ada Lovelace']);
		});

		it('reloads the creator filter after a create, so a first-time creator is listed', async () => {
			skillsStore.createSkill.mockResolvedValue(detail({ id: 's-new' }));
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			expect(skillsStore.fetchCreators).toHaveBeenCalledTimes(1);
			await userEvent.click(getByTestId('skills-create-button'));

			lastModalData().onConfirm({
				skill: { name: 'brand-voice', description: 'Write copy.', instructions: 'Be brief.' },
				scope: 'project:personal-1',
			});
			await new Promise(process.nextTick);

			expect(skillsStore.fetchCreators).toHaveBeenCalledTimes(2);
		});

		it('keeps the modal open with the error on the name when the name is taken', async () => {
			skillsStore.createSkill.mockRejectedValue(
				new ResponseError(SKILL_NAME_TAKEN_MESSAGE, { httpStatusCode: 409 }),
			);
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByTestId('skills-create-button'));

			const result = await lastModalData().onConfirm({
				skill: { name: 'brand-voice', description: 'Write copy.', instructions: 'Be brief.' },
				scope: 'project:personal-1',
			});

			expect(result).toEqual({ saved: false, nameError: SKILL_NAME_TAKEN_MESSAGE });
			expect(showErrorMock).not.toHaveBeenCalled();
		});

		it('says so when the search or the filter hides the new skill', async () => {
			skillsStore.createSkill.mockResolvedValue(detail({ id: 's-new' }));
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByTestId('skills-create-button'));

			lastModalData().onConfirm({
				skill: { name: 'brand-voice', description: 'd', instructions: 'i' },
				scope: 'project:personal-1',
			});
			await new Promise(process.nextTick);

			expect(showMessageMock).toHaveBeenCalledWith({
				title: 'Skill created. Your search or filter hides it.',
				type: 'success',
			});
		});
	});

	describe('edit', () => {
		it.each([
			['instance', true, false, false],
			['project', true, true, true],
			['instance', false, true, undefined],
		] as const)(
			'shows availability in the table and modal behind the Assistant flag (%s, %s)',
			async (scope, enabled, availableToAssistant, expected) => {
				mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(enabled);
				skillsStore.skills = [skill({ scope, availableToAssistant })];
				skillsStore.count = 1;
				skillsStore.fetchSkill.mockResolvedValue(detail({ scope, availableToAssistant }));
				const { getByText, queryByTestId } = renderView();
				expect(queryByTestId('skill-assistant-badge') !== null).toBe(expected === true);
				await userEvent.click(getByText('research-search'));
				await waitFor(() => expect(uiStore.openModalWithData).toHaveBeenCalled());
				expect(lastModalData().availableToAssistant).toBe(expected);
			},
		);

		it('persists a toggle-only save and reloads the list', async () => {
			mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
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
			await userEvent.click(getByText('research-search'));
			await waitFor(() => expect(uiStore.openModalWithData).toHaveBeenCalled());
			skillsStore.fetchSkills.mockClear();
			await lastModalData().onConfirm({ skill: detail().skill, availableToAssistant: true });
			expect(skillsStore.saveSkill).toHaveBeenCalledWith(
				's1',
				expect.objectContaining({ availableToAssistant: true }),
			);
			expect(skillsStore.fetchSkills).toHaveBeenCalled();
			expect(showMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
		});

		it('opens a skill read-only when the user cannot change it', async () => {
			skillsStore.skills = [skill({ canEdit: false })];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail({ canEdit: false }));
			const { getByText } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);

			expect(lastModalData().readOnly).toBe(true);
			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_OPENED_SKILL, {
				skill_id: 's1',
				scope: 'instance',
				read_only: true,
			});
		});

		it('lets the user move a skill that agents use, and hands the modal who uses it', async () => {
			const usedBy = {
				drafts: [
					{
						agentId: 'a1',
						agentName: 'FirstClassDarwin',
						projectId: 'team-1',
						version: 1,
						pinned: false,
					},
				],
				pins: [],
				hiddenAgents: 0,
			};
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail({ usedByAgents: 1, usedBy }));
			const { getByText } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);

			expect(lastModalData().initialScope).toBe('instance');
			// The modal warns about a scope that drops an agent, so the picker stays open.
			expect(lastModalData().scopeLockedReason).toBeUndefined();
			expect(lastModalData().usedBy).toEqual(usedBy);
		});

		it('locks the scope when the user may edit but not delete the skill', async () => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail({ canEdit: true, canDelete: false }));
			const { getByText } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);

			expect(lastModalData().readOnly).toBe(false);
			expect(lastModalData().scopeLockedReason).toBe(
				'You need permission to delete this skill to move it, because moving removes it from where it is now.',
			);
		});

		it('moves an unused skill to the scope the user picks', async () => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail({ scope: 'instance', usedByAgents: 0 }));
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

			expect(lastModalData().scopeLockedReason).toBeUndefined();
			lastModalData().onConfirm({ id: 's1', skill: detail().skill, scope: 'project:personal-1' });
			await new Promise(process.nextTick);

			expect(skillsStore.saveSkill).toHaveBeenCalledWith(
				's1',
				expect.objectContaining({ scope: 'project', projectId: 'personal-1' }),
			);
			// A move is a change even when the content stays the same: no "Nothing to save", and the list reloads.
			expect(showMessageMock).not.toHaveBeenCalled();
			expect(skillsStore.fetchSkills).toHaveBeenCalledTimes(2);
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

		it('sends the hash of the last save when the modal saves again', async () => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(detail());
			skillsStore.saveSkill.mockResolvedValue({
				id: 's1',
				versionId: 'v2',
				version: 2,
				created: true,
				skill: detail().skill,
				skillHash: 'hash-2',
			});
			const { getByText } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);

			await lastModalData().onConfirm({ id: 's1', skill: detail().skill, restoredFrom: 1 });
			await lastModalData().onConfirm({ id: 's1', skill: detail().skill });

			expect(skillsStore.saveSkill).toHaveBeenLastCalledWith(
				's1',
				expect.objectContaining({ baseSkillHash: 'hash-2' }),
			);
		});
	});

	describe('MCP availability', () => {
		async function openSkill(item: SkillDetail) {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(item);
			const { getByText } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByText('research-search'));
			await new Promise(process.nextTick);
		}

		it('hides the toggle while the MCP skills extension is off', async () => {
			await openSkill(detail({ availableToMCP: true }));

			expect(lastModalData().availableToMCP).toBeUndefined();
		});

		it('passes the MCP availability of a skill that has it off, so the editor can turn it on', async () => {
			mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
			await openSkill(detail({ scope: 'project', projectId: 'p1', availableToMCP: false }));

			expect(lastModalData().availableToMCP).toBe(false);
		});

		it('marks the skills that MCP clients get in the table', async () => {
			mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
			skillsStore.skills = [
				skill({ id: 's1', name: 'Served', availableToMCP: true }),
				skill({ id: 's2', name: 'Hidden', availableToMCP: false }),
			];
			skillsStore.count = 2;
			const { getAllByTestId } = renderView();
			await new Promise(process.nextTick);

			const icons = getAllByTestId('skill-available-to-mcp-icon');
			expect(icons).toHaveLength(1);
			expect(icons[0].closest('tr')).toHaveTextContent('Served');
		});

		it('saves a change of the toggle without new content and reloads the list', async () => {
			mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
			skillsStore.saveSkill.mockResolvedValue({
				id: 's1',
				versionId: 'v1',
				version: 1,
				created: false,
				skill: detail().skill,
				skillHash: 'hash-1',
			});
			await openSkill(detail({ availableToMCP: false }));

			expect(lastModalData().availableToMCP).toBe(false);
			lastModalData().onConfirm({ id: 's1', skill: detail().skill, availableToMCP: true });
			await new Promise(process.nextTick);

			expect(skillsStore.saveSkill).toHaveBeenCalledWith(
				's1',
				expect.objectContaining({ availableToMCP: true, baseSkillHash: 'hash-1' }),
			);
			expect(showMessageMock).not.toHaveBeenCalled();
			expect(skillsStore.fetchSkills).toHaveBeenCalledTimes(2);
		});
	});

	it('keeps the modal open and shows a toast when a save fails for another reason', async () => {
		skillsStore.skills = [skill()];
		skillsStore.count = 1;
		skillsStore.fetchSkill.mockResolvedValue(detail());
		skillsStore.saveSkill.mockRejectedValue(
			new ResponseError('The skill was changed somewhere else.', { httpStatusCode: 409 }),
		);
		const { getByText } = renderView();
		await new Promise(process.nextTick);
		await userEvent.click(getByText('research-search'));
		await new Promise(process.nextTick);

		const result = await lastModalData().onConfirm({ id: 's1', skill: detail().skill });

		expect(result).toEqual({ saved: false });
		expect(showErrorMock).toHaveBeenCalledWith(
			expect.any(ResponseError),
			'Could not save the skill',
		);
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

	describe('download', () => {
		async function clickDownload() {
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			await userEvent.click(getByTestId('skill-actions').querySelector('button')!);
			await waitFor(() =>
				expect(document.querySelector('[data-test-id="action-download"]')).toBeInTheDocument(),
			);
			await userEvent.click(document.querySelector('[data-test-id="action-download"]')!);
			await waitFor(() => expect(skillsStore.fetchSkill).toHaveBeenCalledWith('s1'));
			await new Promise(process.nextTick);
		}

		beforeEach(() => {
			skillsStore.skills = [skill()];
			skillsStore.count = 1;
		});

		it('saves a skill without references as SKILL.md and reports it', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail());

			await clickDownload();

			expect(saveAsMock).toHaveBeenCalledWith(expect.any(Blob), 'SKILL.md');
			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DOWNLOADED_SKILL, {
				skill_id: 's1',
				scope: 'instance',
				format: 'markdown',
			});
		});

		it('saves a skill with references as a zip', async () => {
			skillsStore.fetchSkill.mockResolvedValue(
				detail({
					scope: 'project',
					projectId: 'p1',
					skill: {
						name: 'research-search',
						description: 'Find research and cite the evidence.',
						instructions: 'Cite every source.',
						references: [{ path: 'references/style.md', content: '# Style' }],
					},
				}),
			);

			await clickDownload();

			await waitFor(() =>
				expect(saveAsMock).toHaveBeenCalledWith(expect.any(Blob), 'research-search.zip'),
			);
			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DOWNLOADED_SKILL, {
				skill_id: 's1',
				scope: 'project',
				project_id: 'p1',
				format: 'zip',
			});
		});

		it('shows a toast and reports nothing when the skill does not load', async () => {
			skillsStore.fetchSkill.mockRejectedValue(new Error('offline'));

			await clickDownload();

			expect(saveAsMock).not.toHaveBeenCalled();
			expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), 'Could not download the skill');
			expect(trackMock).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DOWNLOADED_SKILL,
				expect.anything(),
			);
		});
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

	describe('Skill Sync', () => {
		/** Stands in for the connect dialog, which has its own tests. */
		const connected = {
			response: {
				sourceId: 'src-1',
				imported: [
					{ key: 'a', skillId: 'k1', name: 'brand-voice' },
					{ key: 'b', skillId: 'k2', name: 'seo-check' },
				],
				failed: [{ key: 'c', name: 'web-scraper', reason: 'parse_error' }],
			},
			sourceLabel: 'acme/skills',
			scopeLabel: 'Global',
		};
		const ConnectDialogStub = {
			name: 'SkillSourceConnectDialog',
			props: ['open', 'scopeOptions'],
			emits: ['update:open', 'connected'],
			setup: () => ({ connected }),
			template: `
				<div v-if="open" data-test-id="connect-dialog-stub" />
				<button data-test-id="connect-dialog-done" @click="$emit('connected', connected)" />
			`,
		};

		function enableSkillSync() {
			mockedStore(usePostHog).isFeatureEnabled.mockImplementation(
				(flag) => String(flag) === SKILL_SYNC_FLAG,
			);
		}

		function renderWithDialogStub() {
			return renderView({ global: { stubs: { SkillSourceConnectDialog: ConnectDialogStub } } });
		}

		it('shows only "Create skill" when the flag is off', () => {
			const { getByTestId, queryByTestId } = renderView();

			expect(getByTestId('skills-create-button')).toBeInTheDocument();
			expect(queryByTestId('skills-create-menu-button')).not.toBeInTheDocument();
		});

		it('offers "Connect to GitHub" in the "Create skills" menu when the flag is on', async () => {
			enableSkillSync();
			const { getByTestId, queryByTestId, findByTestId } = renderWithDialogStub();

			expect(queryByTestId('skills-create-button')).not.toBeInTheDocument();
			await userEvent.click(getByTestId('skills-create-menu-button'));
			expect(await findByTestId('skills-create-manual')).toHaveTextContent('Create manually');
			await userEvent.click(await findByTestId('skills-create-github'));

			expect(await findByTestId('connect-dialog-stub')).toBeInTheDocument();
		});

		it('reloads the list and names the imported and failed skills', async () => {
			enableSkillSync();
			const view = renderWithDialogStub();
			await new Promise(process.nextTick);
			skillsStore.fetchSkills.mockClear();

			await userEvent.click(view.getByTestId('connect-dialog-done'));

			await waitFor(() => expect(skillsStore.fetchSkills).toHaveBeenCalled());
			expect(showMessageMock).toHaveBeenCalledWith({
				title: 'Added 2 skills to Global from acme/skills',
				message: 'Could not add web-scraper (n8n cannot read its SKILL.md).',
				type: 'warning',
			});
		});

		it('opens a synced skill read-only with where it comes from', async () => {
			const syncedFrom = {
				sourceId: 'src-1',
				type: 'github' as const,
				label: 'acme/skills',
				webUrl: 'https://github.com/acme/skills/tree/main/research-search',
				canStopSyncing: false,
			};
			skillsStore.skills = [skill({ source: 'github', canEdit: false })];
			skillsStore.count = 1;
			skillsStore.fetchSkill.mockResolvedValue(
				detail({ source: 'github', canEdit: false, syncedFrom }),
			);
			const { getByText } = renderView();
			await new Promise(process.nextTick);

			await userEvent.click(getByText('research-search'));
			await waitFor(() => expect(uiStore.openModalWithData).toHaveBeenCalled());

			expect(lastModalData().readOnly).toBe(true);
			expect(lastModalData().syncedFrom).toEqual(syncedFrom);
		});

		describe('check for updates', () => {
			async function clickCheck() {
				skillsStore.skills = [
					skill({ source: 'github', canEdit: false, canCheckForUpdates: true }),
				];
				skillsStore.count = 1;
				const view = renderView();
				await new Promise(process.nextTick);
				skillsStore.fetchSkills.mockClear();
				await userEvent.click(view.getByTestId('skill-actions').querySelector('button')!);
				await waitFor(() =>
					expect(
						document.querySelector('[data-test-id="action-checkForUpdates"]'),
					).toBeInTheDocument(),
				);
				await userEvent.click(document.querySelector('[data-test-id="action-checkForUpdates"]')!);
			}

			it.each([
				{
					updatesFound: 0,
					throttled: false,
					title: 'Checked acme/skills',
					message: 'No new changes.',
				},
				{
					updatesFound: 2,
					throttled: false,
					title: 'Checked acme/skills',
					message: '2 skills have updates.',
				},
				{
					updatesFound: 1,
					throttled: true,
					title: 'acme/skills was checked less than a minute ago',
					message: '1 skill has an update.',
				},
			])(
				'says what the check found ($updatesFound, throttled $throttled) and reloads the list',
				async ({ updatesFound, throttled, title, message }) => {
					skillsStore.checkForUpdates.mockResolvedValue({
						label: 'acme/skills',
						updatesFound,
						throttled,
						lastCheckedAt: '2026-10-29T12:00:00.000Z',
					});

					await clickCheck();
					await waitFor(() => expect(skillsStore.fetchSkills).toHaveBeenCalled());

					expect(skillsStore.checkForUpdates).toHaveBeenCalledWith('s1');
					expect(showMessageMock).toHaveBeenCalledWith({ title, message, type: 'success' });
				},
			);

			it.each([
				{
					reason: 'rate_limited',
					text: 'GitHub limits how often n8n can read it. Try again in a few minutes.',
				},
				{
					reason: 'credential_missing',
					text: 'The credential of this source no longer exists, or this scope can no longer use it.',
				},
			])('shows the text of $reason when the check fails', async ({ reason, text }) => {
				skillsStore.checkForUpdates.mockRejectedValue(
					new ResponseError('Server text', { meta: { reason } }),
				);

				await clickCheck();
				await waitFor(() => expect(showErrorMock).toHaveBeenCalled());

				expect(showErrorMock).toHaveBeenCalledWith(new Error(text), 'Could not check for updates');
				expect(showMessageMock).not.toHaveBeenCalled();
			});

			it('keeps the error of a failure without a reason', async () => {
				const error = new Error('Network down');
				skillsStore.checkForUpdates.mockRejectedValue(error);

				await clickCheck();
				await waitFor(() => expect(showErrorMock).toHaveBeenCalled());

				expect(showErrorMock).toHaveBeenCalledWith(error, 'Could not check for updates');
			});
		});

		describe('stop syncing', () => {
			const syncedFrom = {
				sourceId: 'src-1',
				type: 'github' as const,
				label: 'acme/skills',
				webUrl: 'https://github.com/acme/skills/tree/main/research-search',
				canStopSyncing: true,
			};

			async function openSynced(overrides: Partial<SkillDetail> = {}) {
				skillsStore.skills = [skill({ source: 'github', canEdit: false })];
				skillsStore.count = 1;
				skillsStore.fetchSkill.mockResolvedValue(
					detail({ source: 'github', canEdit: false, latestVersion: 3, syncedFrom, ...overrides }),
				);
				const view = renderView();
				await new Promise(process.nextTick);
				await userEvent.click(view.getByText('research-search'));
				await waitFor(() => expect(uiStore.openModalWithData).toHaveBeenCalled());
				skillsStore.fetchSkills.mockClear();
				return view;
			}

			it('stops syncing from the row menu with the same confirmation', async () => {
				skillsStore.skills = [
					skill({ source: 'github', canEdit: false, canStopSyncing: true, latestVersion: 3 }),
				];
				skillsStore.count = 1;
				skillsStore.stopSyncingSkill.mockResolvedValue(undefined);
				const { getByTestId } = renderView();
				await new Promise(process.nextTick);
				skillsStore.fetchSkills.mockClear();

				await userEvent.click(getByTestId('skill-actions').querySelector('button')!);
				await waitFor(() =>
					expect(document.querySelector('[data-test-id="action-stopSyncing"]')).toBeInTheDocument(),
				);
				await userEvent.click(document.querySelector('[data-test-id="action-stopSyncing"]')!);
				await waitFor(() => expect(skillsStore.fetchSkills).toHaveBeenCalled());

				expect(confirmMock).toHaveBeenCalledWith(
					expect.stringContaining('You cannot undo this.'),
					'Stop syncing research-search?',
					expect.anything(),
				);
				expect(skillsStore.stopSyncingSkill).toHaveBeenCalledWith('s1');
				expect(showMessageMock).toHaveBeenCalledWith({
					title: 'research-search stopped syncing. You can edit it now.',
					type: 'success',
				});
			});

			it('locks the scope of a synced skill to its source', async () => {
				await openSynced();

				expect(lastModalData().scopeLockedReason).toBe(
					'Set by the source acme/skills. The skill moves only with its source. To move this skill on its own, stop syncing it first.',
				);
			});

			it('offers Stop syncing only when the user may stop syncing the skill', async () => {
				await openSynced({ syncedFrom: { ...syncedFrom, canStopSyncing: false } });

				expect(lastModalData().onStopSyncing).toBeUndefined();
			});

			it('asks first and says the action cannot be undone', async () => {
				await openSynced();
				confirmMock.mockResolvedValue('cancel');

				await lastModalData().onStopSyncing?.('s1');

				expect(confirmMock).toHaveBeenCalledWith(
					'The skill stays in Global with all 3 versions. Agents keep using it. You can edit it in n8n after this, and move it to another scope on its own. It no longer gets updates from GitHub. You cannot undo this.',
					'Stop syncing research-search?',
					expect.objectContaining({
						confirmButtonText: 'Stop syncing',
						cancelButtonText: 'Cancel',
					}),
				);
				expect(skillsStore.stopSyncingSkill).not.toHaveBeenCalled();
				expect(uiStore.closeModal).not.toHaveBeenCalled();
				expect(skillsStore.fetchSkills).not.toHaveBeenCalled();
			});

			it('stops syncing on confirm, closes the modal and reloads the list', async () => {
				await openSynced();
				skillsStore.stopSyncingSkill.mockResolvedValue(undefined);

				await lastModalData().onStopSyncing?.('s1');

				expect(skillsStore.stopSyncingSkill).toHaveBeenCalledWith('s1');
				expect(uiStore.closeModal).toHaveBeenCalled();
				expect(showMessageMock).toHaveBeenCalledWith({
					title: 'research-search stopped syncing. You can edit it now.',
					type: 'success',
				});
				expect(skillsStore.fetchSkills).toHaveBeenCalled();
			});

			it('shows an error and keeps the modal open when the request fails', async () => {
				await openSynced();
				const error = new Error('Forbidden');
				skillsStore.stopSyncingSkill.mockRejectedValue(error);

				await lastModalData().onStopSyncing?.('s1');

				expect(showErrorMock).toHaveBeenCalledWith(error, 'Could not stop syncing the skill');
				expect(uiStore.closeModal).not.toHaveBeenCalled();
				expect(showMessageMock).not.toHaveBeenCalled();
			});
		});
	});

	it('goes back to the Context overview', async () => {
		const { getByText } = renderView();

		await userEvent.click(getByText('Back to Context'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContext' });
	});
});
