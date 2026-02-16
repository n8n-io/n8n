import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import ToolSettingsContent from './ToolSettingsContent.vue';
import { NodeHelpers, type INode, type INodeTypeDescription } from 'n8n-workflow';
import { waitFor } from '@testing-library/vue';

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

const renderComponent = createComponentRenderer(ToolSettingsContent, {
	global: {
		stubs: {
			ParameterInputList: {
				template: '<div data-test-id="parameter-input-list"><slot /></div>',
				props: ['parameters', 'nodeValues', 'isReadOnly', 'hideDelete', 'node', 'path'],
			},
			NodeCredentials: {
				template: '<div data-test-id="node-credentials" />',
				props: ['node', 'readonly', 'showAll', 'hideIssues'],
			},
		},
	},
});

describe('ToolSettingsContent', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let environmentsStore: ReturnType<typeof mockedStore<typeof useEnvironmentsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		credentialsStore = mockedStore(useCredentialsStore);
		projectsStore = mockedStore(useProjectsStore);
		environmentsStore = mockedStore(useEnvironmentsStore);

		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(MOCK_NODE_TYPE);
		environmentsStore.variablesAsObject = {};
		credentialsStore.allCredentials = [];
		credentialsStore.fetchCredentialTypes = vi.fn().mockResolvedValue(undefined);
		credentialsStore.fetchAllCredentialsForWorkflow = vi.fn().mockResolvedValue(undefined);
		projectsStore.personalProject = { id: 'personal-project', name: 'Personal' } as never;
		projectsStore.setCurrentProject = vi.fn();
	});

	it('should render tabs for parameters and settings', () => {
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
			expect(credentialsStore.fetchAllCredentialsForWorkflow).toHaveBeenCalledWith({
				projectId: 'personal-project',
			});
		});
	});

	describe('makeUniqueName', () => {
		it('should add suffix when auto-generated name conflicts with existing tools', () => {
			// The component auto-renames based on resource/operation, producing "Create contact"
			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ name: 'Test Tool' }),
					existingToolNames: ['Create contact'],
				},
			});

			const nameEmissions = emitted('update:node-name') as string[][];
			expect(nameEmissions).toBeDefined();
			const emittedName = nameEmissions[0][0];
			expect(emittedName).toBe('Create contact (1)');
		});

		it('should increment suffix when multiple conflicts exist', () => {
			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ name: 'Test Tool' }),
					existingToolNames: ['Create contact', 'Create contact (1)'],
				},
			});

			const nameEmissions = emitted('update:node-name') as string[][];
			expect(nameEmissions).toBeDefined();
			const emittedName = nameEmissions[0][0];
			expect(emittedName).toBe('Create contact (2)');
		});

		it('should not add suffix when name is unique', () => {
			// User-edited name that doesn't match default — won't be auto-renamed
			const { emitted } = renderComponent({
				props: {
					initialNode: createMockNode({ name: 'My Unique Tool' }),
					existingToolNames: ['Other Tool'],
				},
			});

			const nameEmissions = emitted('update:node-name') as string[][];
			expect(nameEmissions).toBeDefined();
			expect(nameEmissions[0][0]).toBe('My Unique Tool');
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
			const node = createMockNode({ name: 'First Tool' });
			const { emitted, rerender } = renderComponent({
				props: { initialNode: node },
			});

			await rerender({ initialNode: createMockNode({ name: 'Second Tool' }) });

			await waitFor(() => {
				const nameEmissions = emitted('update:node-name') as string[][];
				const lastEmission = nameEmissions[nameEmissions.length - 1];
				expect(lastEmission[0]).toBe('Second Tool');
			});
		});
	});
});
