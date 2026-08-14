import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import type { AgentCapabilitySummary, InlineAgentConfig } from '@n8n/api-types';
import CanvasNodeAgent from './CanvasNodeAgent.vue';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { inlineAgentToCapabilitySummary } from '@/features/agents/utils/inlineAgent';

const {
	summaryHolder,
	errorHolder,
	summaryAgentIdHolder,
	modelCatalogHolder,
	pushSpy,
	ensureLoadedSpy,
	openBuilderSpy,
} = vi.hoisted(() => ({
	summaryHolder: { value: null as AgentCapabilitySummary | null },
	errorHolder: { value: null as unknown },
	// The agentId ref the card keys the capability-summary composable with.
	summaryAgentIdHolder: { value: null as { value: string } | null },
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
	useAgentCapabilitySummary: (_projectId: unknown, agentId: { value: string }) => {
		summaryAgentIdHolder.value = agentId;
		return { summary: summaryHolder, error: errorHolder };
	},
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
						options: {
							agentSource: 'referenced',
							agentId: { __rl: true, mode: 'list', value, cachedResultName },
						},
					},
				},
			}),
		},
	});
}

function renderWithInlineAgent(inlineAgent: InlineAgentConfig, agentIdValue = '') {
	return renderComponent({
		global: {
			provide: createCanvasNodeProvide({
				data: {
					type: 'n8n-nodes-base.messageAnAgent',
					render: {
						type: CanvasNodeRenderType.Agent,
						options: {
							agentSource: 'inline',
							agentId: { __rl: true, mode: 'list', value: agentIdValue },
							// The projection layer converts the stored config; mirror it
							// here (its output shape is pinned by the render-data tests).
							inlineSummary: inlineAgentToCapabilitySummary('test-node-id', inlineAgent),
						},
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
	summaryAgentIdHolder.value = null;
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
			mcpServers: [],
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
			mcpServers: [],
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
			mcpServers: [],
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

	describe('inline mode', () => {
		const inlineAgent: InlineAgentConfig = {
			config: {
				name: 'Embedded',
				model: 'openai/gpt-5',
				instructions: 'You are a helpful agent',
				tools: [{ type: 'workflow', workflow: 'wf-1', name: 'fetch_availability' }],
			},
		};

		it('renders the name and chips from the embedded config, idling the summary fetch', () => {
			// Resolves the friendly catalog name for the embedded `provider/model` string.
			modelCatalogHolder.value = { openai: { models: { 'gpt-5': { name: 'GPT-5' } } } };

			const { getByText, getAllByTestId } = renderWithInlineAgent(inlineAgent);

			expect(getByText('Embedded')).toBeInTheDocument();
			expect(getByText('GPT-5')).toBeInTheDocument();
			// Tool names from the embedded config are humanized like saved-agent tools.
			expect(getByText('Fetch availability')).toBeInTheDocument();
			expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(1);
			// Inline cards render from the node's own parameters: the capability
			// summary composable is keyed with an empty agentId, so it never fetches.
			expect(summaryAgentIdHolder.value?.value).toBe('');
		});

		it('shows no open-agent affordance, even with a leftover agentId param', () => {
			const { queryByTestId } = renderWithInlineAgent(inlineAgent, 'agent-1');

			// Inline agents have no builder page — they are edited in the node's NDV.
			expect(queryByTestId('canvas-node-agent-open')).toBeNull();
			// And the leftover reference (retained for mode toggling) is not fetched.
			expect(summaryAgentIdHolder.value?.value).toBe('');
		});

		it('is treated as configured with an empty agentId param (no picker)', () => {
			const { getByTestId, queryByTestId } = renderWithInlineAgent(inlineAgent, '');

			expect(getByTestId('canvas-node-agent-model')).toBeInTheDocument();
			expect(queryByTestId('agent-picker-stub')).toBeNull();
		});

		it('renders skill chips from the embedded skill refs and bodies', () => {
			const { getByText, getAllByTestId } = renderWithInlineAgent({
				config: {
					...inlineAgent.config,
					skills: [{ type: 'skill', id: 'skill_triage' }],
				},
				skills: {
					skill_triage: {
						name: 'Triage',
						description: 'Triage incoming requests',
						instructions: 'Categorize the request and route it.',
					},
				},
			});

			expect(getByText('Triage')).toBeInTheDocument();
			// Tool chip + skill chip.
			expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(2);
		});
	});
});
