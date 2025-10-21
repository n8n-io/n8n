import { defineComponent, h, ref, computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { renderComponent } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import { useCommandBar } from './useCommandBar';
import { VIEWS } from '@/constants';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

// Router: drive route-based behavior via a ref
const currentRoute = ref<{ name: string; params: Record<string, string> }>({
	name: VIEWS.WORKFLOW,
	params: {},
});
vi.mock('vue-router', () => ({
	useRouter: () => ({ currentRoute }),
	useRoute: () => currentRoute.value,
	RouterLink: vi.fn(),
}));

// Stores
vi.mock('@/stores/posthog.store', () => ({
	usePostHog: () => ({ isVariantEnabled: vi.fn().mockReturnValue(true) }),
}));
const loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ loadNodeTypesIfNotLoaded }),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		personalProject: { id: 'p1' },
		myProjects: [{ id: 'p1', name: 'Personal' }],
		currentProjectId: 'p1',
	}),
}));
vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ workflow: { name: 'WF' } }),
}));

// Command groups
type MkGroupOptions = {
	loading?: boolean;
	handlers?: {
		onCommandBarChange?: (query: string) => void;
		onCommandBarNavigateTo?: (to: string | null) => void;
	};
	initialize?: () => Promise<void>;
};

const mkGroup = (id: string, opts: MkGroupOptions = {}) => ({
	commands: computed(() => [{ id: `${id}-cmd`, title: `${id} title` }]),
	isLoading: ref(!!opts.loading),
	handlers: opts.handlers,
	initialize: opts.initialize,
});
const changeSpy = vi.fn();
const navSpy = vi.fn();
const nodeInitSpy = vi.fn();

vi.mock('./useNodeCommands', () => ({
	useNodeCommands: () =>
		mkGroup('node', {
			handlers: { onCommandBarChange: changeSpy, onCommandBarNavigateTo: navSpy },
			initialize: nodeInitSpy,
		}),
}));
vi.mock('./useWorkflowCommands', () => ({
	useWorkflowCommands: () => mkGroup('wf', { loading: true }),
}));
vi.mock('./useWorkflowNavigationCommands', () => ({
	useWorkflowNavigationCommands: () => mkGroup('wfn'),
}));
vi.mock('./useDataTableNavigationCommands', () => ({
	useDataTableNavigationCommands: () => mkGroup('dt'),
}));
vi.mock('./useCredentialNavigationCommands', () => ({
	useCredentialNavigationCommands: () => mkGroup('cred'),
}));
vi.mock('./useExecutionNavigationCommands', () => ({
	useExecutionNavigationCommands: () => mkGroup('execnav'),
}));
vi.mock('./useProjectNavigationCommands', () => ({
	useProjectNavigationCommands: () => mkGroup('proj'),
}));
vi.mock('./useExecutionCommands', () => ({
	useExecutionCommands: () => mkGroup('execcmd'),
}));
vi.mock('./useGenericCommands', () => ({
	useGenericCommands: () => mkGroup('gen'),
}));

describe('useCommandBar', () => {
	let api: ReturnType<typeof useCommandBar>;

	const renderHarness = () =>
		renderComponent(
			defineComponent({
				setup() {
					api = useCommandBar();
					return () => h('div');
				},
			}),
			{ pinia: createTestingPinia() },
		);

	beforeEach(() => {
		vi.clearAllMocks();
		currentRoute.value = { name: VIEWS.WORKFLOW, params: {} };
	});

	it('aggregates items for WORKFLOW view and exposes placeholder/context', async () => {
		renderHarness();
		await waitFor(() => expect(api.items.value.length).toBeGreaterThan(0));

		expect(api.placeholder).toBe('commandBar.placeholder');
		expect(api.context.value).toBe('commandBar.sections.workflow ⋅ WF');

		const ids = api.items.value.map((i) => i.id);
		expect(ids).toEqual(expect.arrayContaining(['node-cmd', 'wf-cmd', 'wfn-cmd', 'gen-cmd']));
	});

	it('propagates onCommandBarChange and onCommandBarNavigateTo to groups', () => {
		renderHarness();
		api.onCommandBarChange('abc');
		api.onCommandBarNavigateTo('xyz');
		expect(changeSpy).toHaveBeenCalledWith('abc');
		expect(navSpy).toHaveBeenCalledWith('xyz');
	});

	it('initializes node types and group initializers', async () => {
		renderHarness();
		await api.initialize();
		expect(loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(nodeInitSpy).toHaveBeenCalled();
	});

	it('isLoading is true when any group is loading', () => {
		renderHarness();
		expect(api.isLoading.value).toBe(true);
	});

	it('switches groups when route name changes', async () => {
		renderHarness();
		currentRoute.value = { name: VIEWS.EXECUTIONS, params: {} };
		await waitFor(() =>
			expect(api.items.value.map((i) => i.id)).toEqual(
				expect.arrayContaining(['wfn-cmd', 'proj-cmd', 'cred-cmd', 'dt-cmd', 'gen-cmd']),
			),
		);
	});
});
