import { defineComponent } from 'vue';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { PolicyViolation } from '@n8n/api-types';

import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { usePolicyViolationToast } from './usePolicyViolationToast';

const showMessageSpy = vi.hoisted(() => vi.fn());
const closeSpy = vi.fn();

showMessageSpy.mockReturnValue({ close: closeSpy });

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageSpy }),
}));

const trackSpy = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackSpy }),
}));

const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';

const slackViolation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: `Node type "${SLACK_NODE_TYPE}" is blocked by an instance policy`,
	subject: SLACK_NODE_TYPE,
	subjectType: 'nodeType',
	scope: 'instance',
};

function prepareWorkflowWithTwoSlackNodes() {
	const workflow = createTestWorkflow({
		id: 'w1',
		nodes: [
			createTestNode({ id: 'slack-1', name: 'Slack', type: SLACK_NODE_TYPE }),
			createTestNode({ id: 'set-1', name: 'Set', type: 'n8n-nodes-base.set' }),
			createTestNode({ id: 'slack-2', name: 'Slack1', type: SLACK_NODE_TYPE }),
		],
	});

	useWorkflowsStore().setWorkflowId(workflow.id);
	useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
}

function registerSlackNodeType() {
	mockedStore(useNodeTypesStore).getNodeType = vi
		.fn()
		.mockReturnValue(mockNodeTypeDescription({ name: SLACK_NODE_TYPE, displayName: 'Slack' }));
}

describe('usePolicyViolationToast', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		showMessageSpy.mockClear();
		closeSpy.mockClear();
		trackSpy.mockClear();
		useUIStore().currentView = VIEWS.WORKFLOW;
	});

	afterEach(() => {
		const { closePolicyViolationToast } = usePolicyViolationToast();
		for (const action of ['save', 'publish', 'execute'] as const) closePolicyViolationToast(action);
	});

	it('shows one toast that jumps to every node of the refused type', async () => {
		prepareWorkflowWithTwoSlackNodes();
		registerSlackNodeType();
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');

		const { showPolicyViolationToast } = usePolicyViolationToast();

		showPolicyViolationToast(
			[slackViolation],
			'Problem saving',
			'save',
			createWorkflowDocumentId('w1'),
		);
		expect(showMessageSpy).toHaveBeenCalledTimes(1);

		const toastOptions = showMessageSpy.mock.calls[0][0];
		expect(toastOptions).toMatchObject({ title: 'Problem saving', type: 'error', duration: 0 });

		const { getByTestId } = render(defineComponent({ render: () => toastOptions.message }));
		expect(getByTestId('policy-violation')).toHaveTextContent('Slack node');

		await userEvent.click(getByTestId('policy-violation-jump'));

		expect(emitSpy).toHaveBeenCalledWith('nodes:select', {
			ids: ['slack-1', 'slack-2'],
			panIntoView: true,
		});

		emitSpy.mockRestore();
	});

	it('names a blocked credential type and jumps to the nodes that use it', async () => {
		const workflow = createTestWorkflow({
			id: 'w-credentials',
			nodes: [
				createTestNode({
					id: 'github-1',
					name: 'GitHub',
					type: 'n8n-nodes-base.github',
					credentials: { githubApi: { id: 'c1', name: 'GitHub account' } },
				}),
				createTestNode({ id: 'set-1', name: 'Set', type: 'n8n-nodes-base.set' }),
			],
		});
		useWorkflowsStore().setWorkflowId(workflow.id);
		useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
		mockedStore(useCredentialsStore).getCredentialTypeByName = vi
			.fn()
			.mockReturnValue({ name: 'githubApi', displayName: 'GitHub API', properties: [] });
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');

		const { showPolicyViolationToast } = usePolicyViolationToast();
		showPolicyViolationToast(
			[
				{
					kind: 'credential-type-unavailable',
					checkId: 'credential-type-availability',
					message: 'Credential type "githubApi" is blocked by an instance policy',
					subject: 'githubApi',
					subjectType: 'credentialType',
					scope: 'instance',
				},
			],
			'Problem saving',
			'save',
			createWorkflowDocumentId(workflow.id),
		);

		const { getByTestId } = render(
			defineComponent({ render: () => showMessageSpy.mock.calls[0][0].message }),
		);
		expect(getByTestId('policy-violation')).toHaveTextContent('GitHub API credential');

		await userEvent.click(getByTestId('policy-violation-jump'));

		expect(emitSpy).toHaveBeenCalledWith('nodes:select', { ids: ['github-1'], panIntoView: true });

		emitSpy.mockRestore();
	});

	it('closes the toast it showed before it shows the next one', () => {
		const { showPolicyViolationToast } = usePolicyViolationToast();

		showPolicyViolationToast(
			[slackViolation],
			'Problem saving',
			'save',
			createWorkflowDocumentId('w1'),
		);
		closeSpy.mockClear();
		showPolicyViolationToast(
			[slackViolation],
			'Problem saving',
			'save',
			createWorkflowDocumentId('w1'),
		);

		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it('closes a save refusal once a save succeeds', () => {
		const { showPolicyViolationToast, closePolicyViolationToast } = usePolicyViolationToast();

		showPolicyViolationToast(
			[slackViolation],
			'Problem saving',
			'save',
			createWorkflowDocumentId('w1'),
		);
		closeSpy.mockClear();
		closePolicyViolationToast('save');

		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it('keeps a publish refusal open after a save succeeds', () => {
		const { showPolicyViolationToast, closePolicyViolationToast } = usePolicyViolationToast();

		showPolicyViolationToast(
			[slackViolation],
			'Could not publish',
			'publish',
			createWorkflowDocumentId('w1'),
		);
		closeSpy.mockClear();
		closePolicyViolationToast('save');

		expect(closeSpy).not.toHaveBeenCalled();
	});

	it('offers no jump when the open workflow holds no node of the refused type', () => {
		useWorkflowsStore().setWorkflowId('w-empty');

		const { showPolicyViolationToast } = usePolicyViolationToast();

		showPolicyViolationToast(
			[slackViolation],
			'Problem saving',
			'save',
			createWorkflowDocumentId('w-empty'),
		);

		const { queryByTestId } = render(
			defineComponent({ render: () => showMessageSpy.mock.calls[0][0].message }),
		);
		expect(queryByTestId('policy-violation-jump')).not.toBeInTheDocument();
	});

	it.each([
		['another workflow is on the canvas', VIEWS.WORKFLOW, 'w2'],
		['the version history is open', VIEWS.WORKFLOW_HISTORY, 'w1'],
	])('offers no jump when %s', (_label, currentView, canvasWorkflowId) => {
		prepareWorkflowWithTwoSlackNodes();
		useUIStore().currentView = currentView;
		useWorkflowsStore().setWorkflowId(canvasWorkflowId);

		const { showPolicyViolationToast } = usePolicyViolationToast();
		showPolicyViolationToast(
			[slackViolation],
			'Problem publishing',
			'publish',
			createWorkflowDocumentId('w1'),
		);

		const { queryByTestId } = render(
			defineComponent({ render: () => showMessageSpy.mock.calls[0][0].message }),
		);
		expect(queryByTestId('policy-violation')).toBeInTheDocument();
		expect(queryByTestId('policy-violation-jump')).not.toBeInTheDocument();
	});

	it('reports the backend messages to error telemetry instead of the rendered list', () => {
		useWorkflowsStore().setWorkflowId('w-on-canvas');
		const { showPolicyViolationToast } = usePolicyViolationToast();
		showPolicyViolationToast(
			[slackViolation],
			'Problem saving',
			'save',
			createWorkflowDocumentId('w1'),
		);

		expect(showMessageSpy).toHaveBeenCalledWith(expect.any(Object), false);
		expect(trackSpy).toHaveBeenCalledWith('Instance FE emitted error', {
			error_title: 'Problem saving',
			error_message: slackViolation.message,
			caused_by_credential: false,
			workflow_id: 'w1',
		});
	});
});
