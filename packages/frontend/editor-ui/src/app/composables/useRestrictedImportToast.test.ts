import { defineComponent } from 'vue';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { Project } from '@n8n/rest-api-client';
import type { INode } from 'n8n-workflow';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

import { mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { VIEWS } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useRestrictedImportToast } from './useRestrictedImportToast';

const showMessageSpy = vi.hoisted(() => vi.fn());
const closeSpy = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageSpy }),
}));

const SLACK = 'n8n-nodes-base.slack';
const GMAIL = 'n8n-nodes-base.gmail';
const SET = 'n8n-nodes-base.set';

const DISPLAY_NAMES: Record<string, string> = { [SLACK]: 'Slack', [GMAIL]: 'Gmail' };

const DESCRIPTION_PREFIX =
	"The workflow was imported, but it can't be published or executed until these nodes are replaced or";

const OPEN_AI = '@n8n/n8n-nodes-langchain.openAi';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

function node(id: string, type: string, extra: Partial<INode> = {}): INode {
	return { id, name: id, type, typeVersion: 1, position: [0, 0], parameters: {}, ...extra };
}

type Scopes = Record<string, 'instance' | 'project'>;

function availabilityFrom(scopes: Scopes) {
	return (name: string) => {
		const scope = scopes[name];
		return scope ? { name, available: false, scope } : { name, available: true };
	};
}

function mockRestrictions(nodeTypes: Scopes, credentialTypes: Scopes = {}) {
	const store = mockedStore(useTypeAvailabilityPoliciesStore);
	store.getNodeTypeAvailability.mockImplementation(availabilityFrom(nodeTypes));
	store.getCredentialTypeAvailability.mockImplementation(availabilityFrom(credentialTypes));
}

const WORKFLOW_ID = 'workflow-1';

/** The import already added these nodes to the open canvas. */
function putOnCanvas(...nodes: INode[]) {
	useUIStore().currentView = VIEWS.WORKFLOW;
	useWorkflowsStore().setWorkflowId(WORKFLOW_ID);
	useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID)).setNodes(nodes);
}

function renderMessage() {
	const { message } = showMessageSpy.mock.calls[0][0];
	return render(defineComponent({ render: () => message }));
}

describe('useRestrictedImportToast', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		showMessageSpy.mockReset().mockReturnValue({ close: closeSpy });
		closeSpy.mockClear();
		mockedStore(useNodeTypesStore).getNodeType = vi.fn((name: string) =>
			mockNodeTypeDescription({ name, displayName: DISPLAY_NAMES[name] }),
		);
		mockedStore(useCredentialsStore).getCredentialTypeByName = vi.fn((name: string) =>
			name === 'openAiApi' ? { name, displayName: 'OpenAI', properties: [] } : undefined,
		);
	});

	it('lists a restricted credential type next to a restricted node type, as the save check does', async () => {
		mockRestrictions({ [SLACK]: 'instance' }, { openAiApi: 'instance' });
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');

		const imported = [
			node('slack-1', SLACK),
			node('summarize-1', OPEN_AI, {
				credentials: { openAiApi: { id: 'cred-1', name: 'OpenAI account' } },
			}),
		];
		putOnCanvas(...imported);

		useRestrictedImportToast().warnIfImportHasRestrictedNodes(imported);

		const { getByText, getAllByTestId } = renderMessage();
		expect(getByText('Imported with 2 restricted nodes')).toBeVisible();
		const items = getAllByTestId('policy-violation-jump');
		expect(items.map((item) => item.textContent?.trim())).toEqual([
			'Slack node',
			'OpenAI credential',
		]);

		await userEvent.click(items[1]);
		expect(emitSpy).toHaveBeenCalledWith('nodes:select', {
			ids: ['summarize-1'],
			panIntoView: true,
		});
		emitSpy.mockRestore();
	});

	it('reads the credential type a credential-only node extends', () => {
		mockRestrictions({}, { virusTotalApi: 'instance' });

		const warned = useRestrictedImportToast().warnIfImportHasRestrictedNodes([
			node('virus-total-1', HTTP_REQUEST, { extendsCredential: 'virusTotalApi' }),
		]);

		expect(warned).toBe(true);
		expect(renderMessage().getByTestId('policy-violation')).toHaveTextContent(
			'virusTotalApi credential',
		);
	});

	it('shows no toast when the credential types the nodes use are allowed', () => {
		mockRestrictions({}, { openAiApi: 'instance' });

		const warned = useRestrictedImportToast().warnIfImportHasRestrictedNodes([
			node('slack-1', SLACK, { credentials: { slackApi: { id: 'cred-2', name: 'Slack' } } }),
		]);

		expect(warned).toBe(false);
		expect(showMessageSpy).not.toHaveBeenCalled();
	});

	it('shows no toast when no imported node is restricted', () => {
		mockRestrictions({});

		const { warnIfImportHasRestrictedNodes } = useRestrictedImportToast();

		expect(warnIfImportHasRestrictedNodes([node('node-1', SLACK), node('node-2', SET)])).toBe(
			false,
		);
		expect(showMessageSpy).not.toHaveBeenCalled();
	});

	it('lists every restricted type once, under its scope', () => {
		mockRestrictions({ [SLACK]: 'instance', [GMAIL]: 'instance' });

		const { warnIfImportHasRestrictedNodes } = useRestrictedImportToast();
		const warned = warnIfImportHasRestrictedNodes([
			node('node-3', SLACK),
			node('node-4', SET),
			node('node-5', SLACK),
			node('node-6', GMAIL),
		]);

		expect(warned).toBe(true);
		expect(showMessageSpy).toHaveBeenCalledTimes(1);
		expect(showMessageSpy.mock.calls[0][0]).toMatchObject({
			duration: 0,
			position: 'top-right',
			customClass: 'content-toast restricted-import-toast',
		});

		const { getByText, getAllByTestId } = renderMessage();
		expect(getByText('Imported with 2 restricted nodes')).toBeVisible();
		expect(getByText(`${DESCRIPTION_PREFIX} an instance admin grants access.`)).toBeVisible();
		expect(getByText('Restricted on this instance')).toBeVisible();
		expect(getAllByTestId('policy-violation').map((item) => item.textContent?.trim())).toEqual([
			'Slack node',
			'Gmail node',
		]);
	});

	it('uses the singular title for one restricted type', () => {
		mockRestrictions({ [SLACK]: 'instance' });

		useRestrictedImportToast().warnIfImportHasRestrictedNodes([
			node('node-7', SLACK),
			node('node-8', SLACK),
		]);

		expect(renderMessage().getByText('Imported with 1 restricted node')).toBeVisible();
	});

	it('groups types by scope and points to the admin who can lift them all', () => {
		mockRestrictions({ [SLACK]: 'instance', [GMAIL]: 'project' });

		useRestrictedImportToast().warnIfImportHasRestrictedNodes([
			node('node-9', SLACK),
			node('node-10', GMAIL),
		]);

		const { getByText } = renderMessage();
		expect(getByText('Restricted on this instance')).toBeVisible();
		expect(getByText('Restricted in this project')).toBeVisible();
		expect(getByText(`${DESCRIPTION_PREFIX} an instance admin grants access.`)).toBeVisible();
	});

	it('points to a project admin when only project rules restrict the nodes', () => {
		mockRestrictions({ [GMAIL]: 'project' });
		useTypeAvailabilityPoliciesStore().policyProject = {
			id: 'project-1',
			type: 'team',
		} as Project;

		useRestrictedImportToast().warnIfImportHasRestrictedNodes([node('node-11', GMAIL)]);

		const { getByText } = renderMessage();
		expect(getByText(`${DESCRIPTION_PREFIX} a project admin grants access.`)).toBeVisible();
	});

	it('selects the imported nodes of a type when the user clicks it', async () => {
		mockRestrictions({ [SLACK]: 'instance' });
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');

		const imported = [node('slack-1', SLACK), node('set-1', SET), node('slack-2', SLACK)];
		putOnCanvas(node('slack-old', SLACK), ...imported);

		useRestrictedImportToast().warnIfImportHasRestrictedNodes(imported);

		const { getByTestId } = renderMessage();
		const link = getByTestId('policy-violation-jump');
		expect(link).toHaveTextContent('Slack node');
		expect(link).toHaveAttribute('title', 'Show in workflow');

		await userEvent.click(link);

		expect(emitSpy).toHaveBeenCalledWith('nodes:select', {
			ids: ['slack-1', 'slack-2'],
			panIntoView: true,
		});
		emitSpy.mockRestore();
	});

	it('turns a link into plain text once its nodes are no longer on the canvas', async () => {
		mockRestrictions({ [SLACK]: 'instance' });
		const imported = [node('slack-1', SLACK)];
		putOnCanvas(...imported);

		useRestrictedImportToast().warnIfImportHasRestrictedNodes(imported);
		const { queryByTestId, findByTestId } = renderMessage();
		expect(queryByTestId('policy-violation-jump')).toBeInTheDocument();

		// The user undoes the paste.
		useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID)).setNodes([]);

		await vi.waitFor(() => expect(queryByTestId('policy-violation-jump')).not.toBeInTheDocument());
		expect(await findByTestId('policy-violation')).toHaveTextContent('Slack node');
	});

	it('turns the links into plain text once another workflow is open', async () => {
		mockRestrictions({ [SLACK]: 'instance' });
		const imported = [node('slack-1', SLACK)];
		putOnCanvas(...imported);

		useRestrictedImportToast().warnIfImportHasRestrictedNodes(imported);
		const { queryByTestId } = renderMessage();

		useWorkflowsStore().setWorkflowId('workflow-2');

		await vi.waitFor(() => expect(queryByTestId('policy-violation-jump')).not.toBeInTheDocument());
	});

	it('closes the previous toast before it shows a new one', () => {
		mockRestrictions({ [SLACK]: 'instance' });
		const firstClose = vi.fn();
		showMessageSpy.mockReturnValueOnce({ close: firstClose });
		const { warnIfImportHasRestrictedNodes } = useRestrictedImportToast();

		warnIfImportHasRestrictedNodes([node('node-13', SLACK)]);
		expect(firstClose).not.toHaveBeenCalled();

		warnIfImportHasRestrictedNodes([node('node-14', SLACK)]);
		expect(firstClose).toHaveBeenCalledTimes(1);
		expect(showMessageSpy).toHaveBeenCalledTimes(2);
	});

	it('forgets a toast the user closed', () => {
		mockRestrictions({ [SLACK]: 'instance' });
		const firstClose = vi.fn();
		showMessageSpy.mockReturnValueOnce({ close: firstClose });
		const { warnIfImportHasRestrictedNodes } = useRestrictedImportToast();

		warnIfImportHasRestrictedNodes([node('node-15', SLACK)]);
		showMessageSpy.mock.calls[0][0].onClose();
		warnIfImportHasRestrictedNodes([node('node-16', SLACK)]);

		expect(firstClose).not.toHaveBeenCalled();
	});
});
