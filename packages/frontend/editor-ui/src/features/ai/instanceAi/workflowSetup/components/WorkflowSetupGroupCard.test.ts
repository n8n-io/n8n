import { computed, ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import WorkflowSetupGroupCard from './WorkflowSetupGroupCard.vue';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import type { WorkflowSetupGroup, WorkflowSetupSection } from '../workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn(),
	communityNodeType: vi.fn(() => null),
}));

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType', 'size'],
		template: '<span data-test-id="node-icon" :data-node-type="nodeType?.name" />',
	},
}));

vi.mock('./WorkflowSetupSectionBody.vue', () => ({
	default: {
		props: ['section'],
		template: '<div data-test-id="workflow-setup-section-body" :data-section-id="section.id" />',
	},
}));

const renderComponent = createComponentRenderer(WorkflowSetupGroupCard);

interface ContextOverrides {
	completedIds?: Set<string>;
}

function makeContext(overrides: ContextOverrides = {}): WorkflowSetupContext {
	const completedIds = overrides.completedIds ?? new Set<string>();
	return {
		sections: computed(() => []),
		steps: computed(() => []),
		currentStepIndex: ref(0),
		activeStep: computed(() => undefined),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (section) => section.node as INodeUi,
		isSectionComplete: (section: WorkflowSetupSection) => completedIds.has(section.id),
		isCredentialTestFailed: () => false,
		isSectionSkipped: () => false,
		isStepComplete: () => false,
		isStepSkipped: () => false,
		isStepHandled: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(async () => {}),
		skipCurrentStep: vi.fn(async () => {}),
	};
}

const subnodeRootNode = { name: 'Agent', type: 'agentType', typeVersion: 1, id: 'agent-1' };

describe('WorkflowSetupGroupCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nodeTypesStore.getNodeType.mockImplementation((type: string) => ({
			name: type,
			properties: [],
		}));
	});

	it('renders the root node header even when there is no root section', () => {
		const sub = makeWorkflowSetupSection({
			id: 'Model:openAiApi',
			targetNodeName: 'Model',
		});
		const group: WorkflowSetupGroup = {
			subnodeRootNode,
			subnodeSections: [sub],
		};
		workflowSetupContext.current = makeContext();

		const { getByText, getAllByTestId } = renderComponent({ props: { group } });

		expect(getByText('Agent')).toBeInTheDocument();
		const icons = getAllByTestId('node-icon');
		expect(icons[0].getAttribute('data-node-type')).toBe('agentType');
	});

	it('renders the root section inline without a collapsible header', async () => {
		const rootSection = makeWorkflowSetupSection({
			id: 'Agent:openAiApi',
			targetNodeName: 'Agent',
			credentialType: 'openAiApi',
		});
		const sub = makeWorkflowSetupSection({
			id: 'Model:openAiApi',
			targetNodeName: 'Model',
		});
		const group: WorkflowSetupGroup = {
			subnodeRootNode,
			rootSection,
			subnodeSections: [sub],
		};
		workflowSetupContext.current = makeContext();

		const { getAllByTestId, queryAllByTestId } = renderComponent({ props: { group } });

		const sectionWrappers = getAllByTestId('instance-ai-workflow-setup-section');
		expect(sectionWrappers).toHaveLength(2);

		// Only sub-node sections render a collapsible header.
		const sectionHeaders = queryAllByTestId('instance-ai-workflow-setup-section-header');
		expect(sectionHeaders).toHaveLength(1);

		// Root body is always rendered; the (incomplete) sub-node is
		// auto-expanded since it is the first incomplete sub-node.
		const bodies = getAllByTestId('workflow-setup-section-body');
		const renderedIds = bodies.map((body) => body.getAttribute('data-section-id'));
		expect(renderedIds).toEqual(expect.arrayContaining(['Agent:openAiApi', 'Model:openAiApi']));
		expect(bodies).toHaveLength(2);
	});

	it('toggles sub-node sections via the section header', async () => {
		const rootSection = makeWorkflowSetupSection({
			id: 'Agent:openAiApi',
			targetNodeName: 'Agent',
			credentialType: 'openAiApi',
		});
		const sub = makeWorkflowSetupSection({
			id: 'Model:openAiApi',
			targetNodeName: 'Model',
		});
		const group: WorkflowSetupGroup = {
			subnodeRootNode,
			rootSection,
			subnodeSections: [sub],
		};
		workflowSetupContext.current = makeContext();

		const { getAllByTestId } = renderComponent({ props: { group } });

		// Initial state: root body always rendered + sub-node auto-expanded.
		let bodies = getAllByTestId('workflow-setup-section-body');
		expect(bodies).toHaveLength(2);

		// Only the sub-node has a header; clicking it collapses the sub-node body.
		const headers = getAllByTestId('instance-ai-workflow-setup-section-header');
		expect(headers).toHaveLength(1);
		await fireEvent.click(headers[0]);

		bodies = getAllByTestId('workflow-setup-section-body');
		expect(bodies).toHaveLength(1);
		expect(bodies[0].getAttribute('data-section-id')).toBe('Agent:openAiApi');
	});

	it('shows the complete badge only when every section is complete', () => {
		const rootSection = makeWorkflowSetupSection({
			id: 'Agent:openAiApi',
			targetNodeName: 'Agent',
			credentialType: 'openAiApi',
		});
		const sub = makeWorkflowSetupSection({
			id: 'Model:openAiApi',
			targetNodeName: 'Model',
		});
		const group: WorkflowSetupGroup = {
			subnodeRootNode,
			rootSection,
			subnodeSections: [sub],
		};
		workflowSetupContext.current = makeContext({
			completedIds: new Set([rootSection.id, sub.id]),
		});

		const { getByTestId } = renderComponent({ props: { group } });

		expect(getByTestId('instance-ai-workflow-setup-group-card-check')).toBeInTheDocument();
	});

	it('renders the footer slot', () => {
		const sub = makeWorkflowSetupSection({
			id: 'Model:openAiApi',
			targetNodeName: 'Model',
		});
		const group: WorkflowSetupGroup = {
			subnodeRootNode,
			subnodeSections: [sub],
		};
		workflowSetupContext.current = makeContext();

		const { getByTestId } = renderComponent({
			props: { group },
			slots: { footer: '<div data-test-id="footer-slot">footer</div>' },
		});

		expect(getByTestId('footer-slot')).toBeInTheDocument();
	});
});
