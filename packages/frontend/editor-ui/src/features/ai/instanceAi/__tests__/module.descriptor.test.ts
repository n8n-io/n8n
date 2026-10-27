import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { GLOBAL_MEMBER_SCOPES, GLOBAL_OWNER_SCOPES, type Scope } from '@n8n/permissions';
import type { FrontendModuleSettings } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import {
	PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
	PERSONAL_SELF_HEALING_VIEW,
	SELF_HEALING_CONFIGURATION_VIEW,
} from '@n8n/frontend-constants/self-healing';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { InstanceAiModule } from '../module.descriptor';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_SETTINGS_VIEW } from '../constants';

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => ref(true),
	useInstanceAiReady: () => ref(true),
}));

const { getProject, getMyProjects } = vi.hoisted(() => ({
	getProject: vi.fn(),
	getMyProjects: vi.fn(),
}));
vi.mock('@/features/collaboration/projects/projects.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/collaboration/projects/projects.api')>()),
	getProject,
	getMyProjects,
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

const stub = { render: () => null };

// Swap real lazy components for a stub so navigation doesn't pull the view tree.
function withStubbedComponents(route: RouteRecordRaw): RouteRecordRaw {
	const clone = { ...route } as Record<string, unknown>;
	if (clone.component) clone.component = stub;
	if (Array.isArray(clone.children)) {
		clone.children = (clone.children as RouteRecordRaw[]).map(withStubbedComponents);
	}
	return clone as unknown as RouteRecordRaw;
}

const moduleRoutes = (InstanceAiModule.routes ?? []).map(withStubbedComponents);

// Match the app's top-level, settings, and project route parents.
function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			...moduleRoutes.filter((route) => route.path.startsWith('/')),
			{
				path: '/settings',
				component: stub,
				children: moduleRoutes.filter(
					(route) => !route.path.startsWith('/') && !route.meta?.projectRoute,
				),
			},
			{
				path: '/projects/:projectId',
				component: stub,
				children: moduleRoutes.filter((route) => route.meta?.projectRoute),
			},
		],
	});
}

function setGlobalScopes(scopes: Scope[]) {
	useRBACStore().globalScopes = [...scopes];
}

const instanceAiModuleSettings: NonNullable<FrontendModuleSettings['instance-ai']> = {
	enabled: true,
	mcpConnectionsAvailable: true,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
	workflowSuggestionsEnabled: false,
	assistantAgentEnabled: false,
};

function setAssistantEnabled(enabled: boolean) {
	useSettingsStore().moduleSettings = { 'instance-ai': { ...instanceAiModuleSettings, enabled } };
}

let posthogStore: ReturnType<typeof mockedStore<typeof usePostHog>>;

function setOpenWorkflowInAssistantTreatment(isTreatment: boolean) {
	posthogStore.isVariantEnabled.mockReturnValue(isTreatment);
}

beforeEach(() => {
	vi.clearAllMocks();
	setActivePinia(createTestingPinia({ stubActions: false }));
	posthogStore = mockedStore(usePostHog);
	setOpenWorkflowInAssistantTreatment(false);
	setGlobalScopes(GLOBAL_OWNER_SCOPES);
	setAssistantEnabled(true);
});

describe('InstanceAiModule legacy route redirects', () => {
	it('redirects /instance-ai to the /assistant view', async () => {
		const router = createTestRouter();
		await router.push('/instance-ai');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
		expect(router.currentRoute.value.path).toBe('/assistant');
	});

	it('redirects /instance-ai/:threadId preserving thread id, query and hash', async () => {
		const router = createTestRouter();
		await router.push('/instance-ai/thread-1?foo=bar#section');

		const current = router.currentRoute.value;
		expect(current.name).toBe(INSTANCE_AI_THREAD_VIEW);
		expect(current.params).toEqual({ threadId: 'thread-1' });
		expect(current.query).toEqual({ foo: 'bar' });
		expect(current.hash).toBe('#section');
		expect(current.path).toBe('/assistant/thread-1');
	});

	it('redirects /settings/instance-ai to /settings/assistant', async () => {
		const router = createTestRouter();
		await router.push('/settings/instance-ai');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		expect(router.currentRoute.value.path).toBe('/settings/assistant');
	});
});

const selfHealingRoutes = {
	projectSettings: [
		{ path: '/projects/project/settings/self-healing/new', name: SELF_HEALING_CONFIGURATION_VIEW },
	],
	personalTab: [
		{ path: '/projects/project/self-healing', name: PERSONAL_SELF_HEALING_VIEW },
		{ path: '/projects/project/self-healing/new', name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW },
	],
};

describe.each(['initial navigation', 'from another page'])('self-healing access %s', (entry) => {
	async function open(path: string) {
		const router = createTestRouter();
		if (entry === 'from another page') {
			await router.push('/assistant');
		}
		await router.push(path);
		return router;
	}

	function mockProject(project: Partial<Project>) {
		getMyProjects.mockResolvedValue([
			{
				id: 'project',
				type: project.type,
				scopes: project.scopes,
			},
		]);
		getProject.mockResolvedValue({
			id: 'project',
			name: 'Project',
			icon: null,
			createdAt: '',
			updatedAt: '',
			rolesManaged: false,
			...project,
		} as Project);
	}

	beforeEach(() => {
		getProject.mockReset();
		getMyProjects.mockReset();
		useUsersStore().currentUserId = 'user';
	});

	it.each([
		{ enabled: false, type: 'team', canUpdate: true, owner: 'other', allowedIn: null },
		{ enabled: true, type: 'team', canUpdate: false, owner: 'other', allowedIn: null },
		{ enabled: true, type: 'team', canUpdate: true, owner: 'other', allowedIn: 'projectSettings' },
		{ enabled: true, type: 'personal', canUpdate: false, owner: 'user', allowedIn: 'personalTab' },
		{ enabled: false, type: 'personal', canUpdate: false, owner: 'user', allowedIn: null },
		{ enabled: true, type: 'personal', canUpdate: false, owner: 'other', allowedIn: null },
		{ enabled: true, type: 'personal', canUpdate: true, owner: 'other', allowedIn: null },
	] as const)(
		'checks feature=$enabled, $type project update=$canUpdate and owner=$owner',
		async ({ enabled, type, canUpdate, owner, allowedIn }) => {
			useSettingsStore().moduleSettings = {
				'instance-ai': { ...instanceAiModuleSettings, workflowSuggestionsEnabled: enabled },
			};
			mockProject({
				type,
				relations: [
					{ id: owner, role: type === 'personal' ? 'project:personalOwner' : 'project:admin' },
				] as Project['relations'],
				scopes: canUpdate ? ['project:update'] : ['project:read'],
			});

			for (const [location, routes] of Object.entries(selfHealingRoutes)) {
				for (const { path, name } of routes) {
					const router = await open(path);

					expect(router.currentRoute.value.name).toBe(
						location === allowedIn ? name : VIEWS.HOMEPAGE,
					);
				}
			}
		},
	);

	it('allows a team role with project:update but without project:read', async () => {
		setGlobalScopes(GLOBAL_MEMBER_SCOPES);
		useSettingsStore().moduleSettings = {
			'instance-ai': { ...instanceAiModuleSettings, workflowSuggestionsEnabled: true },
		};
		mockProject({ type: 'team', scopes: ['project:update'] });
		getProject.mockRejectedValue(new Error('Forbidden'));

		expect(
			(await open('/projects/project/settings/self-healing/new')).currentRoute.value.name,
		).toBe(SELF_HEALING_CONFIGURATION_VIEW);
		expect(getProject).not.toHaveBeenCalled();
	});

	it('denies access to a chat user who only views their personal project', async () => {
		useSettingsStore().moduleSettings = {
			'instance-ai': { ...instanceAiModuleSettings, workflowSuggestionsEnabled: true },
		};
		mockProject({
			type: 'personal',
			relations: [{ id: 'user', role: 'project:viewer' }] as Project['relations'],
			scopes: ['project:read'],
		});

		expect((await open('/projects/project/self-healing')).currentRoute.value.name).toBe(
			VIEWS.HOMEPAGE,
		);
	});

	it('loads the project when the store holds the personal project without relations', async () => {
		useSettingsStore().moduleSettings = {
			'instance-ai': { ...instanceAiModuleSettings, workflowSuggestionsEnabled: true },
		};
		const cachedPersonalProject = {
			id: 'project',
			type: 'personal',
			scopes: ['project:read'],
		} as unknown as Project;
		useProjectsStore().currentProject = cachedPersonalProject;
		mockProject({
			type: 'personal',
			relations: [{ id: 'user', role: 'project:personalOwner' }] as Project['relations'],
			scopes: ['project:read'],
		});

		expect((await open('/projects/project/self-healing')).currentRoute.value.name).toBe(
			PERSONAL_SELF_HEALING_VIEW,
		);
		expect(getProject).toHaveBeenCalledWith(expect.anything(), 'project');
		expect(useProjectsStore().currentProject).toStrictEqual(cachedPersonalProject);
	});

	it('denies access when the project cannot be loaded', async () => {
		useSettingsStore().moduleSettings = {
			'instance-ai': { ...instanceAiModuleSettings, workflowSuggestionsEnabled: true },
		};
		mockProject({ type: 'personal', scopes: ['project:read'] });
		getProject.mockRejectedValue(new Error('Forbidden'));

		expect((await open('/projects/project/self-healing')).currentRoute.value.name).toBe(
			VIEWS.HOMEPAGE,
		);
	});

	it('denies access when the project list cannot be loaded', async () => {
		useSettingsStore().moduleSettings = {
			'instance-ai': { ...instanceAiModuleSettings, workflowSuggestionsEnabled: true },
		};
		getMyProjects.mockRejectedValue(new Error('Unavailable'));

		expect(
			(await open('/projects/project/settings/self-healing/new')).currentRoute.value.name,
		).toBe(VIEWS.HOMEPAGE);
	});
});

describe('InstanceAiModule settings page access', () => {
	const isSettingsPageAvailable = () => InstanceAiModule.settingsPages?.[0]?.available;

	describe('a viewer who can manage Instance AI', () => {
		it('is offered the settings page', () => {
			expect(isSettingsPageAvailable()).toBe(true);
		});

		it('reaches the settings page', async () => {
			const router = createTestRouter();
			await router.push('/settings/assistant');

			expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		});
	});

	describe('a member, for whom the page renders no sections', () => {
		beforeEach(() => {
			setGlobalScopes(GLOBAL_MEMBER_SCOPES);
		});

		it('is not offered the settings page', () => {
			expect(isSettingsPageAvailable()).toBe(false);
		});

		it('is sent to the homepage instead of a page with only a header', async () => {
			const router = createTestRouter();
			await router.push('/settings/assistant');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});

		it('is sent to the homepage from the legacy settings path too', async () => {
			const router = createTestRouter();
			await router.push('/settings/instance-ai');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});
	});

	// Experiment cleanup: remove with openWorkflowInAssistant.
	describe('a member in the openWorkflowInAssistant treatment', () => {
		beforeEach(() => {
			setGlobalScopes(GLOBAL_MEMBER_SCOPES);
			setOpenWorkflowInAssistantTreatment(true);
		});

		it('is offered the settings page, which holds their default editor row', () => {
			expect(isSettingsPageAvailable()).toBe(true);
		});

		it('reaches the settings page', async () => {
			const router = createTestRouter();
			await router.push('/settings/assistant');

			expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		});

		describe('while the assistant is off, which hides the row', () => {
			beforeEach(() => {
				setAssistantEnabled(false);
			});

			it('is not offered the settings page', () => {
				expect(isSettingsPageAvailable()).toBe(false);
			});

			it('is sent to the homepage', async () => {
				const router = createTestRouter();
				await router.push('/settings/assistant');

				expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
			});
		});
	});
});
