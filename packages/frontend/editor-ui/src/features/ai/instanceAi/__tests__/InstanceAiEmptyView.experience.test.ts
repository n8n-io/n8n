import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import type { ExperienceMode } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';
import InstanceAiEmptyView from '../InstanceAiEmptyView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { resetExperienceModeState } from '../experience/useExperienceMode';
import { USER_TYPED_MESSAGE } from '../prefills';
import { defaultModuleSettings } from './createThreadComponentRenderer';

// The project choice of the empty view by experience mode. The other behaviour of the view
// is in InstanceAiEmptyView.test.ts.

const PERSONAL = 'personal-1';
const TEAM_WITH_RIGHTS = 'team-a';
const TEAM_READ_ONLY = 'team-b';
const LAST_PROJECT_KEY = 'n8n:instance-ai:last-project:user-1';

const routeQuery = reactive<Record<string, string | undefined>>({});

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ query: routeQuery }),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('uuid', () => ({ v4: () => 'new-thread' }));

/**
 * The composer: a send button, and the footer that holds the project picker. It shows the
 * project that it gives its + menu, where Simple mode adds a new workflow.
 */
const ComposerStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: { mentionProjectId: { type: String, default: undefined } },
	emits: ['submit'],
	setup(props, { emit, expose, slots }) {
		expose({ focus: vi.fn() });
		return () =>
			h('div', { 'data-test-id': 'composer', 'data-project-id': props.mentionProjectId }, [
				h(
					'button',
					{
						'data-test-id': 'composer-send',
						onClick: () =>
							emit('submit', 'Build a report', undefined, () => true, USER_TYPED_MESSAGE),
					},
					'Send',
				),
				slots.footer ? h('div', { 'data-test-id': 'composer-footer' }, slots.footer()) : null,
			]);
	},
});

const renderView = createComponentRenderer(InstanceAiEmptyView, {
	global: { stubs: { InstanceAiInput: ComposerStub, InstanceAiFreeNudge: true } },
});

let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let stored: Map<string, string>;

function useMode(defaultMode: ExperienceMode) {
	useSettingsStore().moduleSettings = {
		'instance-ai': { ...defaultModuleSettings, experience: { enabled: true, defaultMode } },
	};
}

async function startChat(getByTestId: (id: string) => HTMLElement) {
	await fireEvent.click(getByTestId('composer-send'));
	await flushPromises();
}

const startedProject = () => store.syncThread.mock.calls[0]?.[1];

const rememberedProjects = () =>
	vi
		.mocked(localStorage.setItem)
		.mock.calls.filter(([key]) => key === LAST_PROJECT_KEY)
		.map(([, value]) => value);

describe('InstanceAiEmptyView project choice', () => {
	beforeEach(() => {
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		stored = new Map();
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => stored.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => {
				stored.set(key, value);
			}),
			removeItem: vi.fn(),
		});
		createTestingPinia();
		resetExperienceModeState();
		useUsersStore().currentUserId = 'user-1';

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.personalProject = { id: PERSONAL } as Project;
		projectsStore.myProjects = [
			{ id: PERSONAL, type: 'personal', name: 'Me', scopes: ['workflow:create'] },
			{ id: TEAM_WITH_RIGHTS, type: 'team', name: 'Team A', scopes: ['workflow:create'] },
			{ id: TEAM_READ_ONLY, type: 'team', name: 'Team B', scopes: ['workflow:read'] },
		] as ProjectListItem[];

		store = mockedStore(useInstanceAiStore);
		store.syncThread.mockResolvedValue(undefined);
		store.creditsQuota = 100;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('in Simple mode', () => {
		beforeEach(() => useMode('simple'));

		it('removes the composer footer with the project picker', () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);

			const { queryByTestId, queryByText } = renderView();

			expect(queryByTestId('composer-footer')).not.toBeInTheDocument();
			expect(queryByText('Team A')).not.toBeInTheDocument();
		});

		it('starts the chat in the last-used team project', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(startedProject()).toBe(TEAM_WITH_RIGHTS);
		});

		it.each([
			['the user cannot create workflows in it', TEAM_READ_ONLY],
			['it was deleted', 'team-deleted'],
		])(
			'starts in the personal project when the last-used project is set but %s',
			async (_case, id) => {
				stored.set(LAST_PROJECT_KEY, id);

				const { getByTestId } = renderView();
				await startChat(getByTestId);

				expect(startedProject()).toBe(PERSONAL);
			},
		);

		it('keeps the project from ?projectId=', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			routeQuery.projectId = 'team-from-link';

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(startedProject()).toBe('team-from-link');
		});

		it('goes back to the last-used team project when ?projectId= is cleared', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			routeQuery.projectId = 'team-from-link';
			const { getByTestId } = renderView();
			await flushPromises();

			routeQuery.projectId = undefined;
			await flushPromises();
			await startChat(getByTestId);

			expect(startedProject()).toBe(TEAM_WITH_RIGHTS);
		});

		it('remembers the team project of a chat that started', async () => {
			routeQuery.projectId = TEAM_WITH_RIGHTS;

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(rememberedProjects()).toEqual([TEAM_WITH_RIGHTS]);
		});

		it.each([
			['the last-used team project', undefined, TEAM_WITH_RIGHTS],
			['the project from ?projectId=', PERSONAL, PERSONAL],
		])(
			'gives the composer menu %s, so that a new workflow goes where the chat goes',
			(_case, queryProjectId, expected) => {
				stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
				routeQuery.projectId = queryProjectId;

				const { getByTestId } = renderView();

				expect(getByTestId('composer')).toHaveAttribute('data-project-id', expected);
			},
		);

		it.each([
			['the user loses the right to create workflows in it', ['workflow:read']],
			['the project is removed', undefined],
		])('starts in the personal project when %s while the screen is open', async (_case, scopes) => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			const { getByTestId } = renderView();

			projectsStore.myProjects = [
				{ id: PERSONAL, type: 'personal', name: 'Me', scopes: ['workflow:create'] },
				...(scopes ? [{ id: TEAM_WITH_RIGHTS, type: 'team', name: 'Team A', scopes }] : []),
			] as ProjectListItem[];
			await flushPromises();
			await startChat(getByTestId);

			expect(startedProject()).toBe(PERSONAL);
		});
	});

	describe('when the mode changes while the screen is open', () => {
		it('starts the chat in the last-used team project after a switch to Simple', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			useMode('power');
			const { getByTestId, queryByTestId } = renderView();
			expect(getByTestId('composer-footer')).toHaveTextContent('Personal space');

			useMode('simple');
			await flushPromises();
			await startChat(getByTestId);

			expect(queryByTestId('composer-footer')).not.toBeInTheDocument();
			expect(startedProject()).toBe(TEAM_WITH_RIGHTS);
		});

		it('shows the personal project in the picker after a switch to Power', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			useMode('simple');
			const { getByTestId, findByTestId } = renderView();

			useMode('power');

			expect(await findByTestId('composer-footer')).toHaveTextContent('Personal space');
			await startChat(getByTestId);
			expect(startedProject()).toBe(PERSONAL);
		});

		it('keeps the project from ?projectId= in both modes', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			routeQuery.projectId = 'team-from-link';
			useMode('power');
			const { getByTestId } = renderView();

			useMode('simple');
			await flushPromises();
			await startChat(getByTestId);

			expect(startedProject()).toBe('team-from-link');
		});
	});

	describe('in Power mode', () => {
		beforeEach(() => useMode('power'));

		it('keeps the picker and starts in the personal project', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(getByTestId('composer-footer')).toHaveTextContent('Personal space');
			expect(startedProject()).toBe(PERSONAL);
		});

		it('remembers the team project of a chat that started', async () => {
			routeQuery.projectId = TEAM_WITH_RIGHTS;

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(startedProject()).toBe(TEAM_WITH_RIGHTS);
			expect(rememberedProjects()).toEqual([TEAM_WITH_RIGHTS]);
		});

		it('does not remember the personal project', async () => {
			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(startedProject()).toBe(PERSONAL);
			expect(rememberedProjects()).toEqual([]);
		});

		it('does not remember a project when the chat could not start', async () => {
			routeQuery.projectId = TEAM_WITH_RIGHTS;
			store.syncThread.mockRejectedValue(new Error('persist failed'));

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(rememberedProjects()).toEqual([]);
		});
	});

	describe('with the flag off', () => {
		it('keeps the picker and the personal project', async () => {
			stored.set(LAST_PROJECT_KEY, TEAM_WITH_RIGHTS);
			useSettingsStore().moduleSettings = { 'instance-ai': { ...defaultModuleSettings } };

			const { getByTestId } = renderView();
			await startChat(getByTestId);

			expect(getByTestId('composer-footer')).toBeInTheDocument();
			expect(startedProject()).toBe(PERSONAL);
		});
	});
});
