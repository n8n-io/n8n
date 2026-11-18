import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { reactive, shallowRef, type ShallowRef } from 'vue';

import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { VIEWS } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { useUiExtensionPageContext } from './useUiExtensionPageContext';

const route = reactive<{ name: string | undefined; params: Record<string, string> }>({
	name: undefined,
	params: {},
});

vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => route),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

describe(useUiExtensionPageContext, () => {
	let documentStore: ShallowRef<WorkflowDocumentStore | null>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		route.name = undefined;
		route.params = {};
		const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
		store.setName('Payroll');
		store.setNodes([
			createTestNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: { a: 1 } }),
		]);
		documentStore = shallowRef(store);
	});

	it.each([VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW, VIEWS.EXECUTION_DEBUG, VIEWS.TEMPLATE_IMPORT])(
		'maps %s to the workflow page with the open workflow',
		(name) => {
			route.name = name;

			const { pageContext } = useUiExtensionPageContext(documentStore);

			expect(pageContext.value).toEqual({
				page: 'workflow',
				routeName: name,
				workflow: {
					id: 'wf-1',
					name: 'Payroll',
					active: false,
					nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', disabled: false }],
					hasErrorWorkflow: false,
				},
			});
		},
	);

	it('adds the node type facts and the error workflow setting', () => {
		route.name = VIEWS.WORKFLOW;
		useNodeTypesStore().setNodeTypes([
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.manualTrigger',
				displayName: 'Manual Trigger',
				group: ['trigger'],
			}),
			// The mock makes any `group` a trigger group, so a non-trigger passes none.
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				credentials: [{ name: 'slackApi', required: true }],
			}),
			mockNodeTypeDescription({ name: 'n8n-nodes-base.set', displayName: 'Edit Fields (Set)' }),
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				credentials: [{ name: 'httpBasicAuth', required: false }],
				codex: { categories: ['Development', 'Core Nodes'] },
			}),
		]);
		const store = documentStore.value!;
		store.setNodes([
			createTestNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }),
			createTestNode({ name: 'Tell sales', type: 'n8n-nodes-base.slack', disabled: true }),
			createTestNode({ name: 'Mystery', type: 'n8n-nodes-community.unknown' }),
			createTestNode({ name: 'Edit Fields', type: 'n8n-nodes-base.set' }),
			createTestNode({ name: 'Get leads', type: 'n8n-nodes-base.httpRequest' }),
		]);
		store.mergeSettings({ errorWorkflow: 'wf-errors' });

		const { pageContext } = useUiExtensionPageContext(documentStore);

		expect(pageContext.value).toMatchObject({
			workflow: {
				hasErrorWorkflow: true,
				nodes: [
					{
						name: 'Start',
						displayName: 'Manual Trigger',
						isTrigger: true,
						isService: false,
						disabled: false,
					},
					{
						name: 'Tell sales',
						displayName: 'Slack',
						isTrigger: false,
						isService: true,
						disabled: true,
					},
					{ name: 'Mystery', type: 'n8n-nodes-community.unknown', disabled: false },
					{
						name: 'Edit Fields',
						displayName: 'Edit Fields (Set)',
						defaultName: 'n8n-nodes-base.set',
						isService: false,
					},
					// Takes credentials, but is a core node.
					{ name: 'Get leads', displayName: 'HTTP Request', isService: false },
				],
			},
		});
		expect(
			pageContext.value.page === 'workflow' && pageContext.value.workflow?.nodes[2],
		).not.toHaveProperty('displayName');
	});

	it.each([['DEFAULT'], ['']])('reads the error workflow %j as no error workflow', (value) => {
		route.name = VIEWS.WORKFLOW;
		documentStore.value!.mergeSettings({ errorWorkflow: value });

		const { pageContext } = useUiExtensionPageContext(documentStore);

		expect(pageContext.value).toMatchObject({ workflow: { hasErrorWorkflow: false } });
	});

	it('gives no workflow while none is loaded', () => {
		route.name = VIEWS.WORKFLOW;

		const { pageContext } = useUiExtensionPageContext(shallowRef(null));

		expect(pageContext.value).toMatchObject({ page: 'workflow', workflow: null });
	});

	it.each([
		VIEWS.WORKFLOWS,
		VIEWS.PROJECTS_WORKFLOWS,
		VIEWS.SHARED_WORKFLOWS,
		VIEWS.FOLDERS,
		VIEWS.PROJECTS_FOLDERS,
	])('maps %s to the workflows page with the workflow count', (name) => {
		route.name = name;
		route.params = { projectId: 'project-1' };
		useWorkflowsListStore().totalWorkflowCount = 4;

		const { pageContext } = useUiExtensionPageContext(documentStore);

		expect(pageContext.value).toEqual({
			page: 'workflows',
			routeName: name,
			projectId: 'project-1',
			totalWorkflows: 4,
		});
	});

	it('maps every other route to the other page', () => {
		route.name = VIEWS.PERSONAL_SETTINGS;

		const { pageContext } = useUiExtensionPageContext(documentStore);

		expect(pageContext.value).toEqual({ page: 'other', routeName: VIEWS.PERSONAL_SETTINGS });
	});

	it('follows a navigation and a change of the workflow name', () => {
		route.name = VIEWS.WORKFLOW;
		const { pageContext } = useUiExtensionPageContext(documentStore);

		documentStore.value?.setName('Renamed');
		expect(pageContext.value).toMatchObject({ workflow: { name: 'Renamed' } });

		route.name = VIEWS.WORKFLOWS;
		expect(pageContext.value.page).toBe('workflows');
	});

	it('reports whether the open workflow is available in MCP', () => {
		const { workflowAvailableInMcp } = useUiExtensionPageContext(documentStore);
		expect(workflowAvailableInMcp.value).toBe(false);

		documentStore.value?.mergeSettings({ availableInMCP: true });

		expect(workflowAvailableInMcp.value).toBe(true);
	});
});
