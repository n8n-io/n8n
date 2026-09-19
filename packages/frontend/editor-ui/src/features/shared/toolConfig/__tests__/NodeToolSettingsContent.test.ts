import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { getActivePinia, type Pinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { ToolConfigCredentialSelectedKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import NodeToolSettingsContent from '../NodeToolSettingsContent.vue';
import { NodeHelpers, type INode, type INodeTypeDescription } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import { waitFor } from '@testing-library/vue';
import { defineComponent, inject, nextTick, type PropType } from 'vue';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
		nodeText: () => ({
			topParameterPanel: () => '',
			inputLabelDisplayName: (parameter: { displayName: string }) => parameter.displayName,
			inputLabelDescription: (parameter: { description?: string }) => parameter.description,
			placeholder: (parameter: { placeholder?: string }) => parameter.placeholder,
			hint: (parameter: { hint?: string }) => parameter.hint,
			optionsOptionName: (parameter: { name: string }) => parameter.name,
			optionsOptionDescription: (parameter: { description?: string }) => parameter.description,
			collectionOptionName: (parameter: { displayName: string }) => parameter.displayName,
			credentialsSelectAuthDisplayName: (parameter: { displayName: string }) =>
				parameter.displayName,
			credentialsSelectAuthDescription: (parameter: { description?: string }) =>
				parameter.description,
		}),
	};
	return {
		useI18n: () => i18n,
		i18n,
		i18nInstance: { install: vi.fn() },
	};
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const MOCK_NODE_TYPE: INodeTypeDescription = {
	displayName: 'Test Tool',
	name: 'n8n-nodes-base.testTool',
	group: ['transform'],
	version: 1,
	description: 'A test tool',
	defaults: { name: 'Test Tool' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{ name: 'Contact', value: 'contact' },
				{ name: 'Deal', value: 'deal' },
			],
			default: 'contact',
			noDataExpression: true,
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [
				{ name: 'Create', value: 'create' },
				{ name: 'Get', value: 'get' },
			],
			default: 'create',
			noDataExpression: true,
		},
		{
			displayName: 'Name Field',
			name: 'nameField',
			type: 'string',
			default: '',
			required: true,
		},
	],
	credentials: [{ name: 'testApi', required: true }],
};

const MOCK_NODE_TYPE_NO_PARAMS: INodeTypeDescription = {
	...MOCK_NODE_TYPE,
	name: 'n8n-nodes-base.noParamsTool',
	displayName: 'No Params Tool',
	defaults: { name: 'No Params Tool' },
	properties: [
		{
			displayName: 'Info',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	credentials: undefined,
};

function createMockNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'test-node-id',
		name: 'Test Tool',
		type: 'n8n-nodes-base.testTool',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			resource: 'contact',
			operation: 'create',
			nameField: '',
		},
		...overrides,
	};
}

let emitParameterChange: ((data: IUpdateInformation) => void) | null = null;

const ParameterInputListStub = defineComponent({
	props: ['parameters', 'nodeValues', 'isReadOnly', 'hideDelete', 'node', 'path'],
	emits: ['value-changed'],
	setup(props, { emit }) {
		// Registers emitParameterChange only for the params-tab instance (the one
		// without a `path` prop). If the production template adds `path` to that
		// instance, this binding silently breaks — update the condition together.
		if (props.path === undefined) {
			emitParameterChange = (data: IUpdateInformation) => {
				emit('value-changed', data);
			};
		}
		return {};
	},
	template:
		'<div data-test-id="parameter-input-list">{{ JSON.stringify(parameters) }}<slot /></div>',
});

const renderComponent = createComponentRenderer(NodeToolSettingsContent, {
	global: {
		stubs: {
			ParameterInputList: ParameterInputListStub,
			NodeCredentials: {
				template: '<div data-test-id="node-credentials" />',
				props: ['node', 'readonly', 'showAll', 'hideIssues'],
			},
		},
	},
});

// @testing-library/vue's render does not expose the VTU wrapper's `vm`, so
// tests that drive the exposed `handleChangeName` / `isValid` API mount directly.
type Props = InstanceType<typeof NodeToolSettingsContent>['$props'];

const mountComponent = (props: Props) =>
	mount(NodeToolSettingsContent, {
		props,
		global: {
			plugins: [getActivePinia() as Pinia],
			stubs: {
				ParameterInputList: ParameterInputListStub,
				NodeCredentials: {
					template: '<div data-test-id="node-credentials" />',
					props: ['node', 'readonly', 'showAll', 'hideIssues'],
				},
			},
		},
	});

function getToolWorkflowStore() {
	return useWorkflowDocumentStore(createWorkflowDocumentId('node-tool-workflow'));
}

const NODE_TYPE_WITH_ENDPOINT: INodeTypeDescription = {
	...MOCK_NODE_TYPE,
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	properties: [
		{
			displayName: 'URL',
			name: 'endpointUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Include',
			name: 'include',
			type: 'options',
			options: [
				{ name: 'All', value: 'all' },
				{ name: 'Selected', value: 'selected' },
			],
			default: 'all',
		},
		...MOCK_NODE_TYPE.properties,
	],
};

const NODE_WITH_ENDPOINT = createMockNode({
	type: 'n8n-nodes-base.httpRequest',
	name: 'HTTP Request',
	parameters: {},
});

describe('NodeToolSettingsContent', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let environmentsStore: ReturnType<typeof mockedStore<typeof useEnvironmentsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		emitParameterChange = null;

		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		credentialsStore = mockedStore(useCredentialsStore);
		projectsStore = mockedStore(useProjectsStore);
		environmentsStore = mockedStore(useEnvironmentsStore);
		settingsStore = mockedStore(useSettingsStore);

		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(MOCK_NODE_TYPE);
		environmentsStore.variablesAsObject = {};
		credentialsStore.allCredentials = [];
		credentialsStore.setCredentials = vi.fn();
		credentialsStore.fetchCredentialTypes = vi.fn().mockResolvedValue(undefined);
		credentialsStore.fetchUsableCredentials = vi.fn().mockResolvedValue(undefined);
		projectsStore.personalProject = { id: 'personal-project', name: 'Personal' } as never;
		projectsStore.setCurrentProject = vi.fn();
		projectsStore.fetchAndSetProject = vi.fn().mockResolvedValue(undefined);
	});

	it('should hide resource and operation options listed in hiddenOperations', () => {
		const nodeTypeWithHiddenOptions: INodeTypeDescription = {
			...MOCK_NODE_TYPE,
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [
						{ name: 'Row', value: 'row' },
						{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
					],
					default: 'row',
					noDataExpression: true,
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [
						{ name: 'Create', value: 'create' },
						{ name: 'Send and Wait', value: 'sendAndWait' },
					],
					default: 'sendAndWait',
					noDataExpression: true,
				},
			],
		};
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeWithHiddenOptions);

		const { getAllByTestId } = renderComponent({
			props: {
				initialNode: createMockNode({ parameters: {} }),
				hiddenOperations: ['sendAndWait', '__CUSTOM_API_CALL__'],
			},
		});

		const renderedParameters = getAllByTestId('parameter-input-list')
			.map((element) => element.textContent ?? '')
			.join('');
		expect(renderedParameters).toContain('"value":"row"');
		expect(renderedParameters).toContain('create');
		expect(renderedParameters).not.toContain('sendAndWait');
		expect(renderedParameters).not.toContain('__CUSTOM_API_CALL__');
	});

	it('should hide settings tab when there are no settings', () => {
		const { queryByText } = renderComponent({
			props: { initialNode: createMockNode() },
		});

		expect(queryByText('nodeSettings.parameters')).toBeFalsy();
		expect(queryByText('nodeSettings.settings')).toBeFalsy();
	});

	it('should render tabs for parameters and settings when node type has settings', () => {
		const nodeTypeWithSettings: INodeTypeDescription = {
			...MOCK_NODE_TYPE,
			properties: [
				...MOCK_NODE_TYPE.properties,
				{
					displayName: 'Custom Setting',
					name: 'customSetting',
					type: 'boolean',
					default: false,
					isNodeSetting: true,
				},
			],
		};
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeWithSettings);

		const { getByText } = renderComponent({
			props: { initialNode: createMockNode() },
		});

		expect(getByText('nodeSettings.parameters')).toBeTruthy();
		expect(getByText('nodeSettings.settings')).toBeTruthy();
	});

	it('should render ParameterInputList when node is provided', () => {
		const { getAllByTestId } = renderComponent({
			props: { initialNode: createMockNode() },
		});

		expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
	});

	it('syncs parameter changes to the scoped NDV when enabled', async () => {
		const initialNode = createMockNode();
		renderComponent({
			props: { initialNode, syncNodeToNdv: true },
		});
		const toolNdvStore = useNDVStore(createWorkflowDocumentId('node-tool-workflow'));

		expect(toolNdvStore.activeNode?.parameters).toEqual(initialNode.parameters);

		emitParameterChange?.({
			name: 'nameField',
			value: 'updated-value',
		});

		await waitFor(() =>
			expect(toolNdvStore.activeNode?.parameters).toEqual({
				...initialNode.parameters,
				nameField: 'updated-value',
			}),
		);
	});

	it('should render NodeCredentials inside the parameters tab', () => {
		const { getByTestId } = renderComponent({
			props: { initialNode: createMockNode() },
		});

		expect(getByTestId('node-credentials')).toBeTruthy();
	});

	it('should show no-parameters notice when all params are notice type', () => {
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(MOCK_NODE_TYPE_NO_PARAMS);

		const { getByText } = renderComponent({
			props: {
				initialNode: createMockNode({
					type: 'n8n-nodes-base.noParamsTool',
					parameters: {},
				}),
			},
		});

		expect(getByText('nodeSettings.thisNodeDoesNotHaveAnyParameters')).toBeTruthy();
	});

	it('should emit update:valid on mount', async () => {
		const { emitted } = renderComponent({
			props: { initialNode: createMockNode() },
		});

		await waitFor(() => {
			expect(emitted('update:valid')).toBeDefined();
		});
	});

	it('should emit update:node-name on mount when node has a name', async () => {
		const { emitted } = renderComponent({
			props: { initialNode: createMockNode({ name: 'My Tool' }) },
		});

		await waitFor(() => {
			expect(emitted('update:node-name')).toBeDefined();
			const nameEmissions = emitted('update:node-name') as string[][];
			expect(nameEmissions[0][0]).toBe('My Tool');
		});
	});

	it('should set personal project on mount and clear on unmount', async () => {
		const { unmount } = renderComponent({
			props: { initialNode: createMockNode() },
		});

		await waitFor(() => {
			expect(projectsStore.setCurrentProject).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'personal-project' }),
			);
		});

		unmount();

		expect(projectsStore.setCurrentProject).toHaveBeenCalledWith(null);
	});

	it('should fetch credentials on mount when none are loaded', async () => {
		credentialsStore.allCredentials = [];

		renderComponent({
			props: { initialNode: createMockNode() },
		});

		await waitFor(() => {
			expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(false);
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				projectId: 'personal-project',
			});
		});
	});

	it('falls back to the personal project when the provided project id is empty', async () => {
		// useAgentScopeProjectId resolves to '' before project state has loaded on
		// first open; the empty string must not suppress the credential fetch.
		renderComponent({
			props: { initialNode: createMockNode(), projectId: '' },
		});

		await waitFor(() => {
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				projectId: 'personal-project',
			});
		});
	});

	it('loads the personal project when the id is empty and it is not yet available', async () => {
		projectsStore.personalProject = null as never;
		projectsStore.getPersonalProject = vi.fn().mockImplementation(() => {
			projectsStore.personalProject = { id: 'personal-project', name: 'Personal' } as never;
		});

		renderComponent({
			props: { initialNode: createMockNode(), projectId: '' },
		});

		await waitFor(() => {
			expect(projectsStore.getPersonalProject).toHaveBeenCalled();
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				projectId: 'personal-project',
			});
		});
	});

	it('reloads personal project credentials when the shared store is already populated', async () => {
		credentialsStore.allCredentials = [
			{
				id: 'team-cred',
				name: 'Team credential',
				type: 'testApi',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
				isManaged: false,
				data: '',
			},
		];

		renderComponent({
			props: { initialNode: createMockNode() },
		});

		await waitFor(() => {
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				projectId: 'personal-project',
			});
		});
		// The refetch REPLACES the store on resolve; clearing it up front would
		// blank every credential-driven control still visible behind the modal.
		expect(credentialsStore.setCredentials).not.toHaveBeenCalledWith([]);
	});

	it('fetches workflow-scoped credentials for the provided project even when the shared store is already populated', async () => {
		credentialsStore.allCredentials = [
			{
				id: 'personal-cred',
				name: 'Personal credential',
				type: 'testApi',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
				isManaged: false,
				data: '',
			},
		];

		renderComponent({
			props: { initialNode: createMockNode(), projectId: 'team-project' },
		});

		await waitFor(() => {
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				projectId: 'team-project',
			});
		});
		expect(credentialsStore.setCredentials).not.toHaveBeenCalledWith([]);
	});

	describe('makeUniqueName', () => {
		it('should add suffix when auto-generated name conflicts with existing tools', async () => {
			// The component auto-renames based on resource/operation, producing "Create contact"
			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ name: 'Test Tool' }),
					existingToolNames: ['Create contact'],
				},
			});

			await waitFor(() => {
				const nameEmissions = emitted('update:node-name') as string[][];
				expect(nameEmissions).toBeDefined();
				const emittedName = nameEmissions[0][0];
				expect(emittedName).toBe('Create contact (1)');
			});
		});

		it('should increment suffix when multiple conflicts exist', async () => {
			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ name: 'Test Tool' }),
					existingToolNames: ['Create contact', 'Create contact (1)'],
				},
			});

			await waitFor(() => {
				const nameEmissions = emitted('update:node-name') as string[][];
				expect(nameEmissions).toBeDefined();
				const emittedName = nameEmissions[0][0];
				expect(emittedName).toBe('Create contact (2)');
			});
		});

		it('should not add suffix when name is unique', async () => {
			// User-edited name that doesn't match default — won't be auto-renamed
			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ name: 'My Unique Tool' }),
					existingToolNames: ['Other Tool'],
				},
			});

			await waitFor(() => {
				const nameEmissions = emitted('update:node-name') as string[][];
				expect(nameEmissions).toBeDefined();
				expect(nameEmissions[0][0]).toBe('My Unique Tool');
			});
		});
	});

	describe('validity', () => {
		it('should emit valid=true when node has name and no issues', async () => {
			const simpleNodeType: INodeTypeDescription = {
				...MOCK_NODE_TYPE,
				properties: [
					{
						displayName: 'Name Field',
						name: 'nameField',
						type: 'string',
						default: '',
					},
				],
				credentials: undefined,
			};
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(simpleNodeType);

			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ parameters: { nameField: 'test' } }),
				},
			});

			await waitFor(() => {
				const validEmissions = emitted('update:valid') as boolean[][];
				expect(validEmissions).toBeDefined();
				// The last emission should be true (valid)
				const lastEmission = validEmissions[validEmissions.length - 1];
				expect(lastEmission[0]).toBe(true);
			});
		});

		it('should emit valid=false when node has parameter issues', async () => {
			vi.spyOn(NodeHelpers, 'getNodeParametersIssues').mockReturnValue({
				parameters: { nameField: ['Parameter "nameField" is required'] },
			});

			const { emitted } = renderComponent({
				props: { initialNode: createMockNode() },
			});

			await waitFor(() => {
				const validEmissions = emitted('update:valid') as boolean[][];
				expect(validEmissions).toBeDefined();
				const lastEmission = validEmissions[validEmissions.length - 1];
				expect(lastEmission[0]).toBe(false);
			});

			vi.restoreAllMocks();
		});

		it('applies credentials from ToolConfigCredentialSelectedKey onto the local node', async () => {
			const httpLikeNodeType: INodeTypeDescription = {
				...MOCK_NODE_TYPE,
				properties: [
					{
						displayName: 'Name Field',
						name: 'nameField',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Generic Credential Type', value: 'genericCredentialType' },
						],
						default: 'none',
					},
					{
						displayName: 'Generic Auth Type',
						name: 'genericAuthType',
						type: 'credentialsSelect',
						default: '',
						displayOptions: {
							show: { authentication: ['genericCredentialType'] },
						},
					},
				],
				// Non-empty credentials array is required for getNodeCredentialIssues to
				// evaluate generic auth (HTTP Request declares httpSslAuth the same way).
				credentials: [
					{
						name: 'httpSslAuth',
						required: true,
						displayOptions: { show: { provideSslCertificates: [true] } },
					},
				],
			};
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(httpLikeNodeType);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				name: 'httpHeaderAuth',
				displayName: 'Header Auth',
			});

			const toolName = 'HTTP Tool';
			const ParameterInputListStub = defineComponent({
				props: {
					node: { type: Object as PropType<INode | null>, default: null },
				},
				setup() {
					const onCredentialSelected = inject(ToolConfigCredentialSelectedKey, undefined);
					return { onCredentialSelected };
				},
				template: `
					<div data-test-id="parameter-input-list">
						<slot />
						<button
							data-test-id="simulate-credential-selected"
							@click="onCredentialSelected?.({
								name: node?.name ?? '',
								properties: {
									credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Darwin Webhook Auth' } },
								},
							})"
						/>
					</div>
				`,
			});

			const renderWithCredentialSelect = createComponentRenderer(NodeToolSettingsContent, {
				global: {
					stubs: {
						ParameterInputList: ParameterInputListStub,
						NodeCredentials: {
							template: '<div data-test-id="node-credentials" />',
							props: ['node', 'readonly', 'showAll', 'hideIssues'],
						},
					},
				},
			});

			const { emitted, getAllByTestId } = renderWithCredentialSelect({
				props: {
					initialNode: createMockNode({
						name: toolName,
						parameters: {
							nameField: 'test',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpHeaderAuth',
						},
					}),
				},
			});

			await waitFor(() => {
				const validEmissions = emitted('update:valid') as boolean[][];
				expect(validEmissions.at(-1)?.[0]).toBe(false);
			});

			// Params + settings tabs each render ParameterInputList.
			getAllByTestId('simulate-credential-selected')[0].click();

			await waitFor(() => {
				const validEmissions = emitted('update:valid') as boolean[][];
				expect(validEmissions.at(-1)?.[0]).toBe(true);

				const nodeEmissions = emitted('update:node') as INode[][];
				const latestNode = nodeEmissions.at(-1)?.[0];
				expect(latestNode?.credentials?.httpHeaderAuth).toEqual({
					id: 'cred-1',
					name: 'Darwin Webhook Auth',
				});
			});
		});
	});

	describe('customTelemetryTags', () => {
		it('should show settings tab when canUseOtelCustomSpanAttributes is true', () => {
			settingsStore.isOtelCustomSpanAttributesEnabled = true;

			const { getByText } = renderComponent({
				props: { initialNode: createMockNode() },
			});

			expect(getByText('nodeSettings.settings')).toBeTruthy();
		});

		it('should not show settings tab from otel alone when canUseOtelCustomSpanAttributes is false', () => {
			settingsStore.isOtelCustomSpanAttributesEnabled = false;

			const { queryByText } = renderComponent({
				props: { initialNode: createMockNode() },
			});

			expect(queryByText('nodeSettings.settings')).toBeFalsy();
		});
	});

	describe('initialNode watcher', () => {
		it('should initialize parameters with defaults from node type', () => {
			const getNodeParametersSpy = vi.spyOn(NodeHelpers, 'getNodeParameters').mockReturnValue({
				resource: 'contact',
				operation: 'create',
				nameField: 'default-value',
			});

			renderComponent({
				props: { initialNode: createMockNode() },
			});

			expect(getNodeParametersSpy).toHaveBeenCalled();

			vi.restoreAllMocks();
		});

		it('should emit updated name when initialNode changes', async () => {
			const node = createMockNode({ id: 'first-tool-id', name: 'First Tool' });
			const { emitted, rerender } = renderComponent({
				props: { initialNode: node },
			});

			await rerender({
				initialNode: createMockNode({ id: 'second-tool-id', name: 'Second Tool' }),
			});

			await waitFor(() => {
				const nameEmissions = emitted('update:node-name') as string[][];
				const lastEmission = nameEmissions[nameEmissions.length - 1];
				expect(lastEmission[0]).toBe('Second Tool');
			});
		});
	});

	describe('hydration gating', () => {
		beforeEach(() => {
			nodeTypesStore.nodeTypes = {};
			// Hand-rolled imitation of the real store's getNodeType. These tests assert
			// on the component's reactive wiring, not on the store's implementation.
			// Real getNodeType behavior is covered by the nodeTypes store's own tests.
			nodeTypesStore.getNodeType = vi.fn((type: string) => {
				const entry = nodeTypesStore.nodeTypes[type];
				if (!entry) return null;
				if ('name' in entry) return entry as unknown as INodeTypeDescription;
				const versionNumbers = Object.keys(entry).map(Number);
				return entry[Math.max(...versionNumbers)] ?? null;
			});
			nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		});

		it('warm load: ParameterInputList mounts and setNodes called with default parameters', async () => {
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const { getAllByTestId } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
			});

			expect(setNodesSpy).toHaveBeenCalledTimes(1);
			const callArgs = setNodesSpy.mock.calls[0][0] as INode[];
			expect(callArgs.length).toBe(1);
			const nodeArg = callArgs[0];
			expect(nodeArg.parameters.endpointUrl).toBe('');
			Object.entries(nodeArg.parameters).forEach(([_, value]) => {
				expect(value).not.toBeNull();
				expect(value).not.toBeUndefined();
			});
		});

		it('cold load: ParameterInputList is NOT in DOM, setNodes not called, loading placeholder renders', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const { queryAllByTestId, container } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			expect(queryAllByTestId('parameter-input-list')).toHaveLength(0);
			expect(setNodesSpy).not.toHaveBeenCalled();
			expect(container.querySelector('.n8n-spinner')).toBeTruthy();
		});

		it('cold load -> node types arrive: ParameterInputList mounts, setNodes called, spinner gone', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const { queryAllByTestId, getAllByTestId, container } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			expect(queryAllByTestId('parameter-input-list')).toHaveLength(0);
			expect(container.querySelector('.n8n-spinner')).toBeTruthy();

			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			await waitFor(() => {
				expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
			});

			expect(setNodesSpy).toHaveBeenCalledTimes(1);
			const callArgs = setNodesSpy.mock.calls[0][0] as INode[];
			const nodeArg = callArgs[0];
			expect(nodeArg.parameters).toBeDefined();
			expect(nodeArg.parameters.endpointUrl).toBe('');
			expect(container.querySelector('.n8n-spinner')).toBeNull();
		});

		it('invalid/uninstalled node type: error notice renders, spinner gone, ParameterInputList not mounted, setNodes not called', async () => {
			nodeTypesStore.nodeTypes = { 'some-other-type': { 1: MOCK_NODE_TYPE } };

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const { queryAllByTestId, container } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(container.querySelector('[role="alert"]')).toBeTruthy();
			});

			expect(container.querySelector('.n8n-spinner')).toBeNull();
			expect(queryAllByTestId('parameter-input-list')).toHaveLength(0);
			expect(setNodesSpy).not.toHaveBeenCalled();
		});

		it('invalid -> type later appears: error notice disappears, list mounts, store hydrated', async () => {
			nodeTypesStore.nodeTypes = { 'some-other-type': { 1: MOCK_NODE_TYPE } };

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const { getAllByTestId, container } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(container.querySelector('[role="alert"]')).toBeTruthy();
			});

			nodeTypesStore.nodeTypes = {
				'some-other-type': { 1: MOCK_NODE_TYPE },
				'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT },
			};

			await waitFor(() => {
				expect(container.querySelector('[role="alert"]')).toBeNull();
				expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
			});

			expect(setNodesSpy).toHaveBeenCalledTimes(1);
			const nodeInStore = toolWorkflowStore.allNodes[0];
			expect(nodeInStore?.parameters.endpointUrl).toBe('');
		});

		it('store invariant: no unhydrated write in cold load scenario', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();

			renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			let nodeInStore = toolWorkflowStore.allNodes[0];
			expect(nodeInStore).toBeUndefined();

			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			await waitFor(() => {
				nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore).toBeDefined();
				expect(nodeInStore?.parameters).toBeDefined();
				expect(nodeInStore?.parameters).not.toEqual({});
				expect(nodeInStore?.parameters).not.toBeNull();
				expect(nodeInStore?.parameters.endpointUrl).toBe('');
			});
		});

		it('single write on warm load: setNodes called exactly once across mount and first tick', async () => {
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(setNodesSpy).toHaveBeenCalledTimes(1);
			});

			await nextTick();
			expect(setNodesSpy).toHaveBeenCalledTimes(1);
		});

		it('background node-types reactivity does not overwrite user edits', async () => {
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			const toolWorkflowStore = getToolWorkflowStore();

			const { getAllByTestId } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
			});

			emitParameterChange?.({
				name: 'endpointUrl',
				value: 'https://user-typed.example.com',
			});

			await waitFor(() => {
				const nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore?.parameters.endpointUrl).toBe('https://user-typed.example.com');
			});

			nodeTypesStore.nodeTypes = {
				'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT },
				'some-other-type': { 1: MOCK_NODE_TYPE },
			};

			await waitFor(() => {
				const nodeAfterTrigger = toolWorkflowStore.allNodes[0];
				expect(nodeAfterTrigger?.parameters.endpointUrl).toBe('https://user-typed.example.com');
			});
		});

		it('swapping initialNode to different identity DOES re-hydrate', async () => {
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const firstNode = createMockNode({
				id: 'first-id',
				name: 'First Node',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { endpointUrl: 'https://first.example.com' },
			});
			const { rerender } = renderComponent({
				props: { initialNode: firstNode },
			});

			await waitFor(() => {
				expect(setNodesSpy).toHaveBeenCalledTimes(1);
			});

			const secondNode = createMockNode({
				id: 'second-id',
				name: 'Second Node',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { endpointUrl: 'https://second.example.com' },
			});
			setNodesSpy.mockClear();

			await rerender({ initialNode: secondNode });

			await waitFor(() => {
				expect(setNodesSpy).toHaveBeenCalledTimes(1);
				const callArgs = setNodesSpy.mock.calls[0][0] as INode[];
				expect(callArgs[0].name).toBe('Second Node');
				expect(callArgs[0].parameters.endpointUrl).toBe('https://second.example.com');
			});
		});

		it('reference-only change to initialNode (same id) does NOT re-hydrate', async () => {
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			const toolWorkflowStore = getToolWorkflowStore();
			const setNodesSpy = vi.spyOn(toolWorkflowStore, 'setNodes');

			const firstNode = createMockNode({
				id: 'same-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
			});
			const { rerender, getAllByTestId } = renderComponent({
				props: { initialNode: firstNode },
			});

			await waitFor(() => {
				expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
				expect(setNodesSpy).toHaveBeenCalledTimes(1);
			});

			emitParameterChange?.({
				name: 'endpointUrl',
				value: 'https://user-typed.example.com',
			});

			await waitFor(() => {
				const nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore?.parameters.endpointUrl).toBe('https://user-typed.example.com');
			});

			setNodesSpy.mockClear();

			const sameIdNode = {
				...firstNode,
				parameters: { endpointUrl: '' },
			};

			await rerender({ initialNode: sameIdNode });
			await nextTick();

			expect(setNodesSpy).not.toHaveBeenCalled();
			const nodeInStore = toolWorkflowStore.allNodes[0];
			expect(nodeInStore?.parameters.endpointUrl).toBe('https://user-typed.example.com');
		});

		it('loadNodeTypesIfNotLoaded rejection is non-blocking', async () => {
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };
			nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockRejectedValue(new Error('Load failed'));

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const { emitted } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Failed to load node types',
					expect.any(Error),
				);
				expect(emitted('update:valid')).toBeDefined();
			});

			consoleErrorSpy.mockRestore();
		});

		it('isValid is false during cold load and true after hydration', async () => {
			nodeTypesStore.nodeTypes = {};

			const simpleNodeType: INodeTypeDescription = {
				...MOCK_NODE_TYPE,
				properties: [
					{
						displayName: 'Name Field',
						name: 'nameField',
						type: 'string',
						default: '',
					},
				],
				credentials: undefined,
			};

			const wrapper = mountComponent({
				initialNode: createMockNode({ parameters: { nameField: 'test' } }),
			});

			const exposed = wrapper.vm as unknown as { isValid: boolean };
			expect(exposed.isValid).toBe(false);

			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.testTool': { 1: simpleNodeType } };

			await waitFor(() => {
				expect(exposed.isValid).toBe(true);
			});
		});

		it('node types load failure: error notice renders, spinner gone, ParameterInputList not mounted', async () => {
			nodeTypesStore.nodeTypes = {};
			nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockRejectedValue(new Error('Load failed'));

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const { container, queryAllByTestId } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(container.querySelector('[role="alert"]')).toBeTruthy();
			});

			const alert = container.querySelector('[role="alert"]') as HTMLElement;
			expect(alert.textContent).toContain('workflowDiff.error.loadNodeTypes');
			expect(container.querySelector('.n8n-spinner')).toBeNull();
			expect(queryAllByTestId('parameter-input-list')).toHaveLength(0);

			consoleErrorSpy.mockRestore();
		});

		it('deferred hydration preserves a user-edited name', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();

			const wrapper = mountComponent({ initialNode: NODE_WITH_ENDPOINT });

			const exposed = wrapper.vm as unknown as {
				handleChangeName: (name: string) => void;
			};
			exposed.handleChangeName('My Edited Tool');

			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			await waitFor(() => {
				const nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore).toBeDefined();
				expect(nodeInStore?.name).toBe('My Edited Tool');
			});
		});

		it('identity swap before hydration does not leak the previous node name', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();

			const firstNode = createMockNode({
				id: 'leak-first-id',
				name: 'First Node',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { endpointUrl: 'https://first.example.com' },
			});
			const wrapper = mountComponent({ initialNode: firstNode });

			const exposed = wrapper.vm as unknown as {
				handleChangeName: (name: string) => void;
			};
			exposed.handleChangeName('First Node Name');

			// Swap the node identity and let node types arrive in the same flush,
			// as a real cold-start swap resolves. The preserved name belongs to the
			// first node and must not be re-applied to the second one.
			const secondNode = createMockNode({
				id: 'leak-second-id',
				name: 'Second Node',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { endpointUrl: 'https://second.example.com' },
			});
			const swapPromise = wrapper.setProps({ initialNode: secondNode });
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };
			await swapPromise;

			await waitFor(() => {
				const nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore).toBeDefined();
				expect(nodeInStore?.name).toBe('Second Node');
			});
		});

		it('cleared name survives deferred hydration', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();

			const wrapper = mountComponent({ initialNode: NODE_WITH_ENDPOINT });

			const exposed = wrapper.vm as unknown as {
				handleChangeName: (name: string) => void;
				isValid: boolean;
			};
			exposed.handleChangeName('');
			// The computed gates on a truthy name, so an empty name yields a falsy value.
			expect(exposed.isValid).toBeFalsy();

			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			await waitFor(() => {
				const nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore).toBeDefined();
				expect(nodeInStore?.name).toBe('');
			});
		});

		it('id-less node with multiple edits preserves the last edit through deferred hydration', async () => {
			nodeTypesStore.nodeTypes = {};

			const toolWorkflowStore = getToolWorkflowStore();

			const idlessNode = createMockNode({
				id: '',
				name: 'Original Name',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { endpointUrl: 'https://original.example.com' },
			});
			const wrapper = mountComponent({ initialNode: idlessNode });

			const exposed = wrapper.vm as unknown as {
				handleChangeName: (name: string) => void;
			};
			exposed.handleChangeName('First Edit');
			exposed.handleChangeName('Second Edit');

			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			await waitFor(() => {
				const nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore).toBeDefined();
				expect(nodeInStore?.name).toBe('Second Edit');
			});
		});

		it('regression anchor: warm load, simulated user edits update isolated store with no null fields', async () => {
			// Note: The dynamic parameter options fetch surface runs inside child ParameterInput /
			// ParameterOptions components. We assert here on the isolated document store state that
			// feeds those children, proving that currentNodeParameters contains the typed URL and no
			// field is null when subsequent parameter changes (e.g. changing include to 'selected') occur.
			nodeTypesStore.nodeTypes = { 'n8n-nodes-base.httpRequest': { 1: NODE_TYPE_WITH_ENDPOINT } };

			const toolWorkflowStore = getToolWorkflowStore();

			const { getAllByTestId } = renderComponent({
				props: { initialNode: NODE_WITH_ENDPOINT },
			});

			await waitFor(() => {
				expect(getAllByTestId('parameter-input-list').length).toBeGreaterThan(0);
			});

			// Initial hydrated default in store
			let nodeInStore = toolWorkflowStore.allNodes[0];
			expect(nodeInStore?.parameters.endpointUrl).toBe('');

			// Simulate user typing a URL
			emitParameterChange?.({
				name: 'endpointUrl',
				value: 'https://api.example.com/data',
			});

			// Simulate user changing include to 'selected'
			emitParameterChange?.({
				name: 'include',
				value: 'selected',
			});

			await waitFor(() => {
				nodeInStore = toolWorkflowStore.allNodes[0];
				expect(nodeInStore?.parameters.endpointUrl).toBe('https://api.example.com/data');
				expect(nodeInStore?.parameters.include).toBe('selected');
			});

			// Verify that no parameter field is null or undefined
			Object.entries(nodeInStore?.parameters ?? {}).forEach(([key, value]) => {
				expect(value, `parameter ${key} should not be null`).not.toBeNull();
				expect(value, `parameter ${key} should not be undefined`).not.toBeUndefined();
			});
		});
	});
});
