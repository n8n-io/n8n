import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import type { AgentCapabilitySummary } from '@n8n/api-types';
import CanvasNodeAgent from './CanvasNodeAgent.vue';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';

const { summaryHolder, errorHolder, modelCatalogHolder, pushSpy, ensureLoadedSpy, openBuilderSpy } =
	vi.hoisted(() => ({
		summaryHolder: { value: null as AgentCapabilitySummary | null },
		errorHolder: { value: null as unknown },
		modelCatalogHolder: {
			value: {} as Record<string, { models: Record<string, { name: string }> }>,
		},
		pushSpy: vi.fn(),
		ensureLoadedSpy: vi.fn(),
		openBuilderSpy: vi.fn(),
	}));

// The route push itself is covered by useAgentNavigation.test.ts; here we pin
// what the card hands the navigation seam.
vi.mock('@/features/agents/composables/useAgentNavigation', () => ({
	useAgentNavigation: () => ({
		openBuilder: openBuilderSpy,
		openAgent: vi.fn(),
		rememberOrigin: vi.fn(),
	}),
}));

vi.mock('@/features/agents/composables/useAgentCapabilitySummary', () => ({
	useAgentCapabilitySummary: () => ({ summary: summaryHolder, error: errorHolder }),
	clearAgentCapabilitySummaryCache: vi.fn(),
}));

vi.mock('@/features/agents/composables/useModelCatalog', () => ({
	useModelCatalog: () => ({ catalog: modelCatalogHolder, ensureLoaded: ensureLoadedSpy }),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: () => ({ push: pushSpy }),
		useRoute: () => ({ params: {}, query: {} }),
	};
});

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowDocument.store')>();
	return {
		...actual,
		injectWorkflowDocumentStore: () => ({ value: { homeProject: { id: 'proj-1' } } }),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeAgent, {
	global: {
		stubs: {
			CredentialIcon: true,
			CanvasNodeStatusIcons: true,
			AgentSelectorParameterInput: {
				template: '<div><button data-test-id="agent-picker-stub" @click="onPick" /></div>',
				methods: {
					onPick() {
						this.$emit('update:modelValue', { __rl: true, mode: 'list', value: 'agent-9' });
					},
				},
			},
		},
	},
});

function renderWithAgent(value: string, cachedResultName?: string) {
	return renderComponent({
		global: {
			provide: createCanvasNodeProvide({
				data: {
					type: 'n8n-nodes-base.messageAnAgent',
					render: {
						type: CanvasNodeRenderType.Agent,
						options: { agentId: { __rl: true, mode: 'list', value, cachedResultName } },
					},
				},
			}),
		},
	});
}

beforeEach(() => {
	setActivePinia(createTestingPinia());
	summaryHolder.value = null;
	errorHolder.value = null;
	modelCatalogHolder.value = {};
	pushSpy.mockReset();
	openBuilderSpy.mockReset();
	ensureLoadedSpy.mockReset().mockResolvedValue([]);
});

describe('CanvasNodeAgent', () => {
	it('shows the embedded picker and emits update when an agent is selected (empty state)', async () => {
		const { getByTestId, emitted } = renderWithAgent('');

		const picker = getByTestId('agent-picker-stub');
		expect(picker).toBeInTheDocument();

		await fireEvent.click(picker);

		expect(emitted('update')).toBeTruthy();
		expect(emitted('update')[0]).toEqual([
			{ agentId: { __rl: true, mode: 'list', value: 'agent-9' } },
		]);
	});

	it('renders the agent name, friendly model name and tool/skill chips, omitting channels + tasks', () => {
		summaryHolder.value = {
			id: 'agent-1',
			name: 'Configured Agent',
			model: { provider: 'anthropic', model: 'claude-opus-4-8' },
			channels: [{ type: 'slack' }],
			tools: [{ type: 'node', name: 'get_available_dates' }],
			skills: [{ id: 's1', name: 'PR Reviewer' }],
			tasks: [{ id: 't1', name: 'Weekly Summary', enabled: true }],
		};
		// Resolves the friendly catalog name in place of the raw model id.
		modelCatalogHolder.value = {
			anthropic: { models: { 'claude-opus-4-8': { name: 'Claude Opus 4.8' } } },
		};

		const { getByText, getAllByTestId, queryByTestId, queryByText } = renderWithAgent(
			'agent-1',
			'Rob',
		);

		// Summary name wins over the resource-locator cached name.
		expect(getByText('Configured Agent')).toBeInTheDocument();
		expect(getByText('Claude Opus 4.8')).toBeInTheDocument();
		// Raw node tool id is humanized like the edit page.
		expect(getByText('Get available dates')).toBeInTheDocument();
		expect(getByText('PR Reviewer')).toBeInTheDocument();
		// Channels + tasks belong to standalone agents and aren't shown on the card.
		expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(2);
		expect(queryByText('Weekly Summary')).toBeNull();
		expect(queryByTestId('agent-picker-stub')).toBeNull();
	});

	it('shows a "No model selected" placeholder for a configured agent with no model', () => {
		summaryHolder.value = {
			id: 'agent-1',
			name: 'Empty Agent',
			model: null,
			channels: [],
			tools: [],
			skills: [],
			tasks: [],
		};

		const { getByText, queryByTestId } = renderWithAgent('agent-1');

		// The body never collapses to empty: the model row always renders.
		expect(getByText('No model selected')).toBeInTheDocument();
		expect(queryByTestId('canvas-node-agent-chip')).toBeNull();
		expect(queryByTestId('agent-picker-stub')).toBeNull();
	});

	it('shows the load-error message and no model row or picker when the summary fails to load', () => {
		summaryHolder.value = null;
		errorHolder.value = new Error('boom');

		const { getByText, queryByTestId } = renderWithAgent('agent-1');

		expect(getByText(/Couldn.t load agent details/)).toBeInTheDocument();
		// The error branch replaces the body: no model row, no chips, no picker.
		expect(queryByTestId('canvas-node-agent-model')).toBeNull();
		expect(queryByTestId('canvas-node-agent-chip')).toBeNull();
		expect(queryByTestId('agent-picker-stub')).toBeNull();
	});

	it('opens the agent builder without an origin node when the open affordance is clicked', async () => {
		summaryHolder.value = {
			id: 'agent-1',
			name: 'Configured Agent',
			model: null,
			channels: [],
			tools: [],
			skills: [],
			tasks: [],
		};

		const { getByTestId } = renderWithAgent('agent-1');

		await fireEvent.click(getByTestId('canvas-node-agent-open'));

		// Exact args — no origin node id: a set node id would make "Back to
		// workflow" reopen this node's NDV instead of landing on the canvas.
		expect(openBuilderSpy).toHaveBeenCalledWith('proj-1', 'agent-1');
	});

	it('emits activate (opens NDV) on double-click', async () => {
		const { getByTestId, emitted } = renderWithAgent('agent-1');

		await fireEvent.dblClick(getByTestId('canvas-node-agent'));

		expect(emitted('activate')).toBeTruthy();
	});

	it('does not open NDV when double-clicking the embedded picker (empty state)', async () => {
		const { getByTestId, emitted } = renderWithAgent('');

		await fireEvent.dblClick(getByTestId('agent-picker-stub'));

		expect(emitted('activate')).toBeFalsy();
	});
});
